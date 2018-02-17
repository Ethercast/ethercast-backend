import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {

  if (cb) {
    cb(
      null,
      {
        statusCode: 204
      }
    );
  }
};
