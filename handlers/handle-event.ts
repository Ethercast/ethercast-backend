import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  // TODO: handle the first request to confirm the webhook by visiting the url
  console.log('event', JSON.stringify(event), 'context', JSON.stringify(context));

  // TODO: put an logs in the SQS queue for pushing webhooks
  throw new Error('not implemented!');
};
