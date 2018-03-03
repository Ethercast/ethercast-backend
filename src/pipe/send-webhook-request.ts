import 'source-map-support/register';
import { Context, Handler, SNSEvent } from 'aws-lambda';
import fetch from 'node-fetch';
import { JoiLog, Log } from '@ethercast/model';
import { Subscription, WebhookReceiptResult } from '../util/models';
import logger from '../util/logger';
import * as Joi from 'joi';
import SubscriptionCrud from '../util/subscription-crud';
import { DynamoDB, SNS } from 'aws-sdk';
import * as _ from 'underscore';

const client = new DynamoDB.DocumentClient();
const sns = new SNS();
const crud = new SubscriptionCrud({ client, logger });

async function notifyEndpoint(crud: SubscriptionCrud, subscription: Subscription, log: Log): Promise<WebhookReceiptResult> {
  const meta = _.pick(log, 'address', 'transactionHash', 'logIndex');

  // we create this here to correlate logs from sending the webhook with the receipt we store in dynamo
  try {
    logger.debug({ meta, subscriptionId: subscription.id }, 'notifying subscription');

    const response = await fetch(
      subscription.webhookUrl,
      {
        method: 'POST',
        headers: {
          'user-agent': 'ethercast',
          'x-ethercast-subscription-id': subscription.id
        },
        body: JSON.stringify(log),
        timeout: 1000
      }
    );

    const status = response.status;

    logger.info({
      meta,
      subscriptionId: subscription.id,
      responseStatus: status
    }, `delivered event`);

    const success = status >= 200 && status < 300;

    // we need to deactivate the webhook if we see a 410
    if (status === 410) {
      logger.info({ subscription }, 'respecting 410 response with deactivation');

      try {
        await sns.unsubscribe({ SubscriptionArn: subscription.subscriptionArn }).promise();
        await crud.deactivate(subscription.id);
        logger.info({ subscription }, 'unsubscribed subscription due to 410 response');
      } catch (err) {
        logger.error({ err }, 'failed to unsubscribe in response to a 410');
      }
    }

    return { success, statusCode: status };
  } catch (err) {
    logger.warn({ err, log, subscription, meta }, `failed to send log to subscription`);

    return { success: false, statusCode: 0 };
  }
}

async function sendLogNotification(crud: SubscriptionCrud, subscriptionArn: string, log: Log) {
  const subscription = await crud.getByArn(subscriptionArn);
  const receipt = await notifyEndpoint(crud, subscription, log);
  await crud.saveReceipt(subscription, receipt);
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

/**
 * This function always succeeds so as to prevent SNS from retrying a whole bunch
 */
export const handle: Handler = async (event: SNSEvent, context: Context) => {
  // Make sure it's an SNS message
  const { value, error } = JoiSnsNotification.validate(event, { allowUnknown: true });

  if (error) {
    logger.error({ error }, 'sns event failed joi validation');
    context.succeed('sns event failed joi validation');
    return;
  }

  for (let i = 0; i < value.Records.length; ++i) {
    const { EventSubscriptionArn, Sns: { Message } } = value.Records[i];

    const { value: log, error } = JoiLog.validate(JSON.parse(Message), { allowUnknown: true });

    if (error) {
      logger.error({ error }, 'log failed validation');
      context.succeed('log failed validation');
    } else {
      try {
        await sendLogNotification(crud, EventSubscriptionArn, log);
        context.succeed('log notification sent');
      } catch (err) {
        logger.error({ err, record: value.Records[i] }, 'failed to send log notification');
        context.succeed('failed to send');
      }
    }
  }
};
