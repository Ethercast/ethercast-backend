import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (cb) {
    cb(
      null,
      {
        statusCode: 200,
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
