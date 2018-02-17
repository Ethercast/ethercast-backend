import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (cb) {
    cb(
      null,
      {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
          'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(
          {
            id: 'sub-1',
            name: 'My subscription',
            topics: [
              [
                { type: 'address', value: '0x000' },
                { type: 'topic', value: '0x000' }
              ],
              [
                { type: '' }
              ]
            ]
          }
        )
      }
    );
  }
};
