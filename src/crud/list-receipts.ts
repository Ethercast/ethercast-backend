import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { handle as getHandler } from './get-sub';
import { crud, Subscription } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) throw new Error('invalid call');

  getHandler(event, context, async (err, data) => {
    if (err) return cb(err);

    const subscription = JSON.parse((data as any).body) as Subscription;
    console.log('got subscription', subscription);

    const receipts = await crud.listReceipts(subscription.id);

    cb(null, createResponse(200, receipts));
  });
};
