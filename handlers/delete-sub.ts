import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { handle as getHandler } from './get-sub';
import { crud, Subscription } from './util/subscription-crud';
import createResponse from './util/create-response';
import unsubscribeTopics from './util/unsubscribe-topics';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  getHandler(event, context, async (err, data) => {
    if (err) {
      cb(err);
    }

    const subscription = JSON.parse((data as any).body) as Subscription;

    console.log('got subscription', subscription);

    console.log('unsubscribing topics');
    // first unsubscribe all the topics
    await unsubscribeTopics(subscription.id);

    console.log('deactivating id');
    // then deactivate it
    await crud.deactivate(subscription.id);

    cb(
      null,
      createResponse(204)
    );
  });
};
