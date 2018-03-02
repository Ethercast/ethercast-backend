import 'source-map-support/register';
import { Context, Handler } from 'aws-lambda';
import QueueDrainer, { Message } from '../util/queue-drainer';
import { JoiLog } from '@ethercast/model';
import logger from '../util/logger';
import { LOG_QUEUE_NAME } from '../util/env';
import * as SQS from 'aws-sdk/clients/sqs';
import LogMessageProducer from '../util/log-message-producer';
import { getTopicArn } from '../util/sns-subscription-util';

const sqs = new SQS();


export const handle: Handler = async (event, context: Context) => {
  const notificationTopicArn = await getTopicArn();
  const producer = new LogMessageProducer(notificationTopicArn);

  const handleQueueMessage = async (message: Message) => {
    if (!message.Body) {
      throw new Error(`missing message body`);
    }

    const { value: log, error } = JoiLog.validate(JSON.parse(message.Body), { allowUnknown: true });
    if (error) {
      logger.error({ error }, 'invalid log received');
      throw new Error(`log failed validation`);
    }

    return producer.publish(log);
  };


  try {
    const { QueueUrl } = await sqs.getQueueUrl({
      QueueName: LOG_QUEUE_NAME
    }).promise();

    if (!QueueUrl) {
      throw new Error(`could not get queue url for name: ${LOG_QUEUE_NAME}`);
    }

    logger.info({ QueueUrl }, 'dequeueing from queue');

    const consumer = new QueueDrainer(QueueUrl, handleQueueMessage, context.getRemainingTimeInMillis);
    const count = await consumer.start();

    logger.info({ count }, 'removed count');
  } catch (err) {
    logger.error({ err }, 'failing to drain queue');
    throw err;
  }
};
