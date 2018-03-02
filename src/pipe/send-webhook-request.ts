import 'source-map-support/register';
import { Callback, Context, Handler, SNSEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import fetch from 'node-fetch';
import { Log } from '@ethercast/model';
import { Subscription, WebhookReceiptResult } from '../util/models';
import logger from '../util/logger';
import * as Joi from 'joi';
import SubscriptionCrud from '../util/subscription-crud';

const client = new DocumentClient();

async function notifyEndpoint(subscription: Subscription, log: Log): Promise<WebhookReceiptResult> {
  const meta = { txHash: log.transactionHash, logIndex: log.logIndex };

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

    return { success, statusCode: status };
  } catch (err) {
    logger.error({ err, log, subscription, meta }, `failed to send log to subscription`);

    return { success: false, statusCode: 0 };
  }
}

async function sendLogNotification(crud: SubscriptionCrud, subscriptionArn: string, log: Log) {
  const subscription = await crud.getByArn(subscriptionArn);
  const receipt = await notifyEndpoint(subscription, log);
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

  const crud = new SubscriptionCrud({ client });

  for (let i = 0; i < value.Records.length; ++i) {
    const { EventSubscriptionArn, Sns: { Message } } = value.Records[i];

    try {
      const log = JSON.parse(Message);
      await sendLogNotification(crud, EventSubscriptionArn, log);
    } catch (err) {
      logger.error({ err, record: value.Records[i] }, 'failed to send log notification');
      throw err;
    }
  }
};
