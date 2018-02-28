import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) throw new Error('invalid caller');

  const { pathParameters } = event;
  if (!pathParameters) return cb(new Error('missing path parameter id'));

  const { requestContext: { authorizer: { user } } } = event as any;
  if (!user) return cb(new Error('invalid user on request'));

  const { id } = pathParameters;
  if (!id) return cb(new Error('missing path parameter id'));

  const subscription = await crud.get(id);
  if (subscription.user !== user) return cb(new Error('invalid user or invalid sub id'));

  cb(null, createResponse(200, subscription));
};
