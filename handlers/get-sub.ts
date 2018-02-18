import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './util/subscription-crud';
import createResponse from './util/create-response';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid caller');
  }

  const { pathParameters } = event;
  const { requestContext: { authorizer: { user } } } = event as any;

  if (!user) {
    cb(new Error('invalid user on request'));
    return;
  }

  if (!pathParameters) {
    cb(new Error('missing path parameter id'));
    return;
  }

  const { id } = pathParameters;
  if (!id) {
    cb(new Error('missing path parameter id'));
    return;
  }

  const subscription = await crud.get(id);

  if (subscription.user !== user) {
    cb(new Error('invalid user or invalid sub id'));
    return;
  }

  cb(
    null,
    createResponse(200, subscription)
  );
};
