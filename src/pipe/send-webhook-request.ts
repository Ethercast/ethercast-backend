import 'source-map-support/register';
import { Callback, Context, Handler, SNSEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import fetch from 'node-fetch';
import { Log } from '@ethercast/model';
import { SUBSCRIPTIONS_TABLE, WEBHOOK_RECEIPTS_TABLE } from '../util/env';
import { Subscription } from '../util/models';
import logger from '../util/logger';
import * as Joi from 'joi';
import uuid = require('uuid');
import * as _ from 'underscore';

const client = new DocumentClient();

async function getSubscriptionWithArn(subscriptionArn: string): Promise<Subscription> {
  try {
    logger.info({ subscriptionArn }, 'querying subscription');

    const { Items } = await client.query({
      TableName: SUBSCRIPTIONS_TABLE,
      IndexName: 'BySubscriptionArn',
      Limit: 1,
      KeyConditionExpression: 'subscriptionArn = :subscriptionArn',
      ExpressionAttributeValues: { ':subscriptionArn': subscriptionArn }
    }).promise();

    if (!Items || Items.length !== 1) {
      logger.error({ Items }, 'unexpected query result');
      throw new Error('unexpected query result');
    }

    return Items[0] as Subscription;
  } catch (err) {
    logger.error({ err }, 'failed to get subscription by arn');
    throw err;
  }
}

interface NotificationReceipt {
  success: boolean;
  responseStatus: number;
  receiptId: string;
}

async function notifyEndpoint(subscription: Subscription, log: Log): Promise<NotificationReceipt> {
  // we create this here to correlate logs from sending the webhook with the receipt we store in dynamo
  const receiptId = uuid.v4();

  try {
    logger.debug(
      { receiptId, subscriptionId: subscription.id },
      'notifying subscription'
    );

    const response = await fetch(
      subscription.webhookUrl,
      {
        method: 'POST',
        headers: {
          'user-agent': 'ethercast',
          'x-ethercast-subscription-id': subscription.id,
          'x-ethercast-receipt-id': receiptId
        },
        body: JSON.stringify(log),
        timeout: 1000
      }
    );

    const status = response.status;

    logger.info({
      receiptId,
      subscriptionId: subscription.id,
      responseStatus: status
    }, `delivered event`);

    const success = status >= 200 && status < 300;

    return { success, responseStatus: status, receiptId };
  } catch (err) {
    logger.error({ err, log, subscription, receiptId }, `failed to send log to subscription`);

    return { success: false, responseStatus: 0, receiptId };
  }
}

async function saveReceipt(subscription: Subscription, receipt: NotificationReceipt) {
  try {
    logger.debug({ subscription, receipt }, 'saving receipt');

    await client.put({
      TableName: WEBHOOK_RECEIPTS_TABLE,
      Item: {
        id: receipt.receiptId,
        subscriptionId: subscription.id,
        receipt: _.omit(receipt, 'receiptId')
      }
    }).promise();

    logger.debug({ subscription, receipt }, 'saved receipt');
  } catch (err) {
    logger.error({ err, subscription, receipt }, `failed to save receipt`);
    throw err;
  }
}

async function sendLogNotification(subscriptionArn: string, log: Log) {
  const subscription = await getSubscriptionWithArn(subscriptionArn);
  const receipt = await notifyEndpoint(subscription, log);
  await saveReceipt(subscription, receipt);
}

const JoiSnsNotification = Joi.object({
  Records: Joi.array().items(
    Joi.object({
      EventSubscriptionArn: Joi.string().required(),
      Sns: Joi.object({
        Message: Joi.string().required()
      }).required()
    })
  ).required()
});

export const handle: Handler = async (event: SNSEvent, context: Context, callback?: Callback) => {
  if (!callback) {
    throw new Error('invalid call to handler, missing callback');
  }

  // Make sure it's an SNS message
  const { value, error } = JoiSnsNotification.validate(event, { allowUnknown: true });

  if (error) {
    logger.error({ error }, 'sns event failed joi validation');
    callback(new Error('sns event failed joi validation'));
    return;
  }

  for (let i = 0; i < value.Records.length; ++i) {
    const { EventSubscriptionArn, Sns: { Message } } = value.Records[i];

    try {
      const log = JSON.parse(Message);
      await sendLogNotification(EventSubscriptionArn, log);
    } catch (err) {
      logger.error({ err, record: value.Records[i] }, 'failed to send log notification');
      throw err;
    }
  }
};
