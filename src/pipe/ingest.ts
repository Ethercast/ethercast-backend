import { Context, Handler } from 'aws-lambda';
import { Topic as Producer } from './topic';
import { Message, Queue as Consumer } from './queue';
import { Log, mustBeValidLog } from '@ethercast/model';
import toMessageAttributes from '../util/to-message-attributes';
import logger from '../util/logger';
import { LOG_QUEUE_NAME, NOTIFICATION_TOPIC_ARN } from '../util/env';
import * as SQS from 'aws-sdk/clients/sqs';

const sqs = new SQS();

const producer = new Producer(NOTIFICATION_TOPIC_ARN);

const handleQueueMessage = async (message: Message) => {
  if (!message.Body) {
    throw new Error(`missing message body`);
  }

  const log: Log = mustBeValidLog(JSON.parse(message.Body));

  // get attributes of the log
  const attributes = toMessageAttributes(log);

  return producer.publish(attributes, log);
};

export const handler: Handler = async (event, context: Context) => {
  try {
    const { QueueUrl } = await sqs.getQueueUrl({
      QueueName: LOG_QUEUE_NAME
    }).promise();

    if (!QueueUrl) {
      throw new Error(`could not get queue url for name: ${LOG_QUEUE_NAME}`);
    }

    logger.info({ QueueUrl }, 'dequeueing from queue');

    const consumer = new Consumer(QueueUrl, handleQueueMessage, context.getRemainingTimeInMillis);
    const count = await consumer.dequeue();

    logger.info({ count }, 'removed count');
  } catch (err) {
    logger.error({ err }, 'failing queue');
    throw err;
  }
};
