import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  console.log(event);

  // TODO: handle when an SNS topic for a subscription gets notified by pushing the webhook event to
  // an SQS queue
  throw new Error('not implemented!');
};
