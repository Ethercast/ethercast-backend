import { SNSEvent, Context, Handler } from 'aws-lambda';

interface Event {
  subscription_id: string;
  webhook_url: string;
}

const lookup = async () => {
  // TODO
};

const ping = async () => {
  // TODO
};

const logReceipt = async () => {
  // TODO
};

const egest = async (subscriptionArn: string, message: Message) => {
  const subscription = await lookup(subscriptionArn);
  const result = await ping(subscription);
  await logReceipt(subscription, result);
};

export const handler: Handler = async (event: SNSEvent, context: Context) => {
  try {
    if (!subscriptionArn) throw new Error('missing subscription arn');
    const subscriptionArn = event.EventSubscriptionArn;

    if (!event.Sns) throw new Error('missing SNS');
    if (!event.Sns.Message) throw new Error('missing SNS message');
    const message = event.Sns.Message;

    await egest(subscriptionArn, message);
  } catch (err) {
    throw new Error(`${err}: ${event}`);
  }
};
