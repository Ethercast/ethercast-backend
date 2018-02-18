import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    console.log('invalid caller');
    return;
  }
  const { requestContext: { authorizer: { user } } } = event as any;

  if (!user) {
    cb(new Error('invalid user'));
    return;
  }

  const list = await crud.list(user);

  if (cb) {
    cb(
      null,
      createResponse(200, list)
    );
  }
};
