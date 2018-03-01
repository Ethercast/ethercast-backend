import { Context, Handler } from 'aws-lambda';

import { Topic as Producer } from './topic';
import { Queue as Consumer, Message } from './queue';

const BUFFER_MS = Number(process.env.BUFFER_MS);
const QUEUE_URL = process.env.QUEUE_URL;
const TOPIC_ARN = process.env.TOPIC_ARN;

interface Log {
  address: string;
  topics: string[];
  added: boolean;
  removed: boolean;
}

const producer = new Producer(TOPIC_ARN);

const ingest = (producer: Producer) => async (message: Message) => {
  const log: Log = JSON.parse(message.Body);

  // validate the log
  try {
    // TODO: use joi validation
    if (!log.address) throw 'missing log address';
    if (!log.topics) throw 'missing log topics';
    if (!Array.isArray(log.topics)) throw 'log topics must be an array';
  } catch (err) {
    throw new Error(`${err}: ${message.Body}`);
  }

  // get attributes of the log
  const attributes = {address: log.address};
  for (let i = 0; i < log.topics.length; ++i) {
    attributes[`topic_${i}`] = log.topics[i];
  }

  return producer.publish(attributes, log);
}

export const handler: Handler = async (event, context: Context) => {
  const shouldQuit = () => context.getRemainingTimeInMillis() < BUFFER_MS;
  try {
    const consumer = new Consumer(QUEUE_URL, ingest, context.getRemainingTimeInMillis);
    const count = await consumer.dequeue();
  } catch (err) {
    console.error('failing queue', err);
    throw err;
  }
}
