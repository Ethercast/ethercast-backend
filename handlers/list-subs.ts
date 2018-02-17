import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud } from './subscription-crud';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    console.log('invalid caller');
    return;
  }

  const { requestContext: { identity: { user } } } = event;

  if (!user) {
    cb(new Error('invalid user'));
    return;
  }

  const list = await crud.list(user);

  if (cb) {
    cb(
      null,
      {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
          'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(list)
      }
    );
  }
};
