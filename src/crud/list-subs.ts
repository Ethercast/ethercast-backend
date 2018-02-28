import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) throw new Error('invalid caller');

  const { requestContext: { authorizer: { user } } } = event as any;
  if (!user) return cb(new Error('invalid user'));

  const list = await crud.list(user);

  cb(null, createResponse(200, list));
};
