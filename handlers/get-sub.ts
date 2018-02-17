import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './subscription-crud';

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
    {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify(subscription)
    }
  );
};
