import { Context, Handler } from 'aws-lambda';
import { Topic as Producer } from './topic';
import { Queue as Consumer, Message } from './queue';
import { Log, mustBeValidLog } from '@ethercast/model';
import toMessageAttributes from '../util/to-message-attributes';

const QUEUE_URL = process.env.QUEUE_URL;
const TOPIC_ARN = process.env.TOPIC_ARN;

const producer = new Producer(TOPIC_ARN);

const ingest = async (message: Message) => {
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
    const consumer = new Consumer(QUEUE_URL, ingest, context.getRemainingTimeInMillis);
    const count = await consumer.dequeue();
  } catch (err) {
    console.error('failing queue', err);
    throw err;
  }
};
