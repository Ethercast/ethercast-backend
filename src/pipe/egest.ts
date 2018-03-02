import { Context, Handler, SNSEvent } from 'aws-lambda';

interface Subscription {
}

const lookup = async (subscriptionArn: string) => {
  // TODO
  return {};
};

const ping = async (subscription: Subscription) => {
  // TODO
  return 0;
};

const logReceipt = async (subscription: Subscription, result: number) => {
  // TODO
};

const egest = async (subscriptionArn: string, message: string) => {
  const subscription = await lookup(subscriptionArn);
  const result = await ping(subscription);
  await logReceipt(subscription, result);
};

export const handler: Handler = async (event: SNSEvent, context: Context) => {
  try {
    const { Records: records } = event;
    if (!records) throw new Error('missing records');
    if (!Array.isArray(records)) throw new Error('records is not an array');
  } catch (err) {
    throw new Error(`${err}: ${event}`);
  }

  await Promise.all(event.Records.map(async (record) => {
    try {
      const { EventSubscriptionArn: subscriptionArn } = record;
      if (!subscriptionArn) throw new Error('missing subscription arn');

      const { Sns: { Message: message } } = record;
      if (!message) throw new Error('missing message');

      await egest(subscriptionArn, message);
    } catch (err) {
      throw new Error(`${err}: ${event}`);
    }
  }));
};
