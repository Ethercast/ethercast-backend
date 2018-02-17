import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { handle as getHandler } from './get-sub';
import { crud } from './util/subscription-crud';

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

    // TODO: remove subscribers from the SNS topics

    cb(
      null,
      {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
          'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        }
      }
    );
  });
};
