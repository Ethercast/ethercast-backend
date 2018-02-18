import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { handle as getHandler } from './get-sub';
import { crud } from './util/subscription-crud';
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

    const { id } = (data as any).body;

    // first unsubscribe all the topics
    await unsubscribeTopics(id);

    // then deactivate it
    await crud.deactivate(id);

    cb(
      null,
      createResponse(204)
    );
  });
};
