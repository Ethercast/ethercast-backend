import 'source-map-support/register';
import { Callback, Context, Handler } from 'aws-lambda';
import QueueDrainer, { Message } from '../util/queue-drainer';
import { JoiLog } from '@ethercast/model';
import logger from '../util/logger';
import { LOG_QUEUE_NAME, NOTIFICATION_TOPIC_NAME } from '../util/env';
import * as SQS from 'aws-sdk/clients/sqs';
import LogMessageProducer from '../util/log-message-producer';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import * as SNS from 'aws-sdk/clients/sns';
import * as Lambda from 'aws-sdk/clients/lambda';

const sqs = new SQS();
const sns = new SNS();

export const handle: Handler = async (event, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('no callback passed in');
  }

  const subscriptionUtil = new SnsSubscriptionUtil({ lambda: new Lambda(), sns });

  let producer: LogMessageProducer;
  try {
    const notificationTopicArn = await subscriptionUtil.getTopicArn(NOTIFICATION_TOPIC_NAME);
    producer = new LogMessageProducer(sns, notificationTopicArn);
  } catch (err) {
    logger.error({ err }, 'failed to get notification topic arn');
    cb(null, err);
  }

  const handleQueueMessage = async (message: Message) => {
    if (!message.Body) {
      throw new Error(`missing message body`);
    }

    const { value: log, error } = JoiLog.validate(JSON.parse(message.Body), { allowUnknown: true });
    if (error) {
      logger.error({ error }, 'invalid log received');
      throw new Error(`log failed validation`);
    }

    await producer.publish(log);
  };


  try {
    const { QueueUrl } = await sqs.getQueueUrl({ QueueName: LOG_QUEUE_NAME }).promise();

    if (!QueueUrl) {
      throw new Error(`could not get queue url for name: ${LOG_QUEUE_NAME}`);
    }

    logger.info({ QueueUrl }, 'dequeueing from queue');

    const consumer = new QueueDrainer(sqs, QueueUrl, handleQueueMessage, context.getRemainingTimeInMillis);
    const count = await consumer.start();

    logger.info({ count }, 'removed count');
  } catch (err) {
    logger.error({ err }, 'failing to drain queue');
    throw err;
  }
};
