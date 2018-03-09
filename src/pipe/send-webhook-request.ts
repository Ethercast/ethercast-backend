import 'source-map-support/register';
import { Context, Handler, SNSEvent } from 'aws-lambda';
import fetch from 'node-fetch';
import { Subscription, WebhookReceiptResult } from '../util/models';
import logger from '../util/logger';
import * as Joi from 'joi';
import SubscriptionCrud from '../util/subscription-crud';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as SNS from 'aws-sdk/clients/sns';

const client = new DynamoDB.DocumentClient();
const sns = new SNS();
const crud = new SubscriptionCrud({ client, logger });

async function notifyEndpoint(crud: SubscriptionCrud, subscription: Subscription, message: string): Promise<WebhookReceiptResult> {
  // we create this here to correlate logs from sending the webhook with the receipt we store in dynamo
  try {
    logger.debug({ subscriptionId: subscription.id }, 'notifying subscription');

    const response = await fetch(
      subscription.webhookUrl,
      {
        method: 'POST',
        // TODO: sign message
        headers: {
          'user-agent': 'ethercast',
          'x-ethercast-subscription-id': subscription.id,
          'content-type': 'application/json'
        },
        body: message,
        timeout: 1000
      }
    );

    const status = response.status;

    logger.info({ subscriptionId: subscription.id, responseStatus: status }, `delivered event`);

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
    logger.warn({ err, subscription }, `failed to send log to subscription`);

    return { success: false, statusCode: 0 };
  }
}

async function sendLogNotification(crud: SubscriptionCrud, subscriptionArn: string, message: string) {
  const subscription = await crud.getByArn(subscriptionArn);
  const receipt = await notifyEndpoint(crud, subscription, message);
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
    context.fail(new Error('sns event failed joi validation'));
    return;
  }

  for (let i = 0; i < value.Records.length; i++) {
    const { EventSubscriptionArn, Sns: { Message } } = value.Records[i];

    if (error) {
      logger.error({ error }, 'log failed validation');
      context.fail(new Error('log failed validation'));
    } else {
      try {
        await sendLogNotification(crud, EventSubscriptionArn, Message);
      } catch (err) {
        logger.error({ err, record: value.Records[i] }, 'failed to send log notification');
        context.fail(new Error('failed to send a notification'));
        return;
      }
    }
  }

  context.succeed('delivered webhook');
};
