import 'source-map-support/register';
import { Context, Handler, SNSEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import fetch from 'node-fetch';
import { Log } from '@ethercast/model';
import { SUBSCRIPTIONS_TABLE, WEBHOOK_RECEIPTS_TABLE } from '../util/env';
import { Subscription } from '../util/models';
import logger from '../util/logger';

interface Response {
  success: boolean;
  status: number;
}

const client = new DocumentClient();

const lookup = async (subscriptionArn: string) => {
  logger.info({subscriptionArn}, 'querying subscription');
  const { Items } = await client.query({
    TableName: SUBSCRIPTIONS_TABLE,
    IndexName: 'BySubscriptionArn',
    Limit: 1,
    KeyConditionExpression: 'HashKey = :hkey',
    ExpressionAttributeValues: { ':hkey': subscriptionArn },
  }).promise();

  logger.info({Items}, 'found subscription');
  if (!Items || Items.length !== 1) {
    logger.error({Items}, 'strange query result');
    throw('strange query result, expected 1 item');
  }

  return Items[0] as Subscription;
};

const ping = async (subscription: Subscription, log: Log) => {
  return fetch(subscription.webhookUrl, {
    method: 'POST',
    headers: {
      'user-agent': 'ethercast',
      'x-ethercast-subscription-id': subscription.id,
    },
    body: JSON.stringify(log),
    timeout: 1000,
  })
    .then((response) => {
      const status = response.status;
      logger.info(`Delivered event to ${subscription.webhookUrl}: ${status}`);
      const success = status >= 200 && status < 300;
      return { success, status };
    }, (err) => {
      logger.warn(`Failed delivery to ${subscription.webhookUrl}: ${err.toString()}`);
      return { success: false, status: 0 };
    });
  // TODO unsubscribe
};

const logReceipt = async (subscription: Subscription, result: Response) => {
  // TODO
};

const egest = async (subscriptionArn: string, log: Log) => {
  const subscription = await lookup(subscriptionArn);
  const result = await ping(subscription, log);
  await logReceipt(subscription, result);
};

export const handle: Handler = async (event: SNSEvent, context: Context) => {
  try {
    const { Records: records } = event;
    if (!records) throw new Error('missing records');
    if (!Array.isArray(records)) throw new Error('records is not an array');
  } catch (err) {
    throw new Error(`${err}: ${event}`);
  }

  for (let i = 0; i < event.Records.length; ++i) {
    const record = event.Records[i];
    try {
      const { EventSubscriptionArn: subscriptionArn } = record;
      if (!subscriptionArn) throw new Error('missing subscription arn');

      const { Sns: { Message: message } } = record;
      if (!message) throw new Error('missing message');

      const log = JSON.parse(message);
      await egest(subscriptionArn, log);
    } catch (err) {
      logger.error({record}, err.toString());
    }
  }
};
