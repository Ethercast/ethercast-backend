import 'source-map-support/register';
import { Context, Handler } from 'aws-lambda';
import { mustBeValidTransaction, Transaction } from '@ethercast/model';
import logger from '../util/logger';
import { NOTIFICATION_TOPIC_NAME, TX_QUEUE_NAME } from '../util/env';
import LogMessageProducer from '../util/message-producer';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import QueueDrainer from '@ethercast/queue-drainer';
import * as SQS from 'aws-sdk/clients/sqs';
import * as SNS from 'aws-sdk/clients/sns';
import * as Lambda from 'aws-sdk/clients/lambda';

const sqs = new SQS();
const sns = new SNS();
const lambda = new Lambda();

export const handle: Handler = async (event, context: Context) => {
  const subscriptionUtil = new SnsSubscriptionUtil({ lambda, sns });

  let producer: LogMessageProducer;
  try {
    const notificationTopicArn = await subscriptionUtil.getTopicArn(NOTIFICATION_TOPIC_NAME);
    producer = new LogMessageProducer(sns, notificationTopicArn);
  } catch (err) {
    logger.error({ err }, 'failed to get notification topic arn');
    context.fail(err);
  }

  const handleQueueMessage = async (message: SQS.Types.Message) => {
    if (!message.Body) {
      throw new Error(`missing message body`);
    }

    let tx: Transaction;
    try {
      tx = mustBeValidTransaction(JSON.parse(message.Body));
    } catch (err) {
      logger.error({ err }, 'invalid log received');
      throw new Error(`log failed validation`);
    }

    await producer.publishTransaction(tx);
  };


  try {
    const { QueueUrl } = await sqs.getQueueUrl({ QueueName: TX_QUEUE_NAME }).promise();

    if (!QueueUrl) {
      throw new Error(`could not get queue url for name: ${TX_QUEUE_NAME}`);
    }

    logger.info({ QueueUrl }, 'dequeueing from queue');

    const consumer = new QueueDrainer({
      logger,
      sqs,
      queueUrl: QueueUrl,
      handleMessage: handleQueueMessage,
      shouldContinue: () => context.getRemainingTimeInMillis() > 3000
    });

    const count = await consumer.drain();

    logger.info({ count }, 'removed count');
    context.succeed('drained log queue');
  } catch (err) {
    logger.error({ err }, 'failing to drain queue');
    context.fail(err);
  }
};
