import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { handle as getHandler } from './get-sub';
import { crud } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  getHandler(event, context, async (err, data) => {
    if (err) {
      cb(err);
    }

    const { id } = (data as any).body;

    await crud.deactivate(id);

    // TODO: remove subscriptions


    cb(
      null,
      createResponse(204)
    );
  });
};
