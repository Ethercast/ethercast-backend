import { APIGatewayEvent, Callback, Context, Handler, SNSMessage } from 'aws-lambda';
import * as MessageValidator from 'sns-validator';
import * as request from 'request';
import createResponse from './util/create-response';

const validator = new MessageValidator();
const { SUBSCRIPTIONS_ARN_TABLE } = process.env;

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  const {
    queryStringParameters,
    body
  } = event;

  if (!body) {
    throw new Error('missing body in the request');
  }

  if (!SUBSCRIPTIONS_ARN_TABLE) {
    throw new Error('missing environment variable: SUBSCRIPTIONS_ARN_TABLE');
  }

  if (!queryStringParameters) {
    throw new Error('missing query string parameters from the request');
  }

  const { webhookUrl, subscriptionId } = queryStringParameters;

  if (!webhookUrl || !subscriptionId) {
    throw new Error('missing either webhookUrl or subscriptionId from the query string parameters');
  }

  const parsedBody = JSON.parse(body) as any;

  console.log(`handling sns event for ${subscriptionId}: ${webhookUrl}`);

  validator.validate(
    parsedBody,
    (err: any, message: any) => {
      if (err) {
        console.log('failed to validate the message', err);
        cb(err);
      } else {
        switch (message.Type) {
          case 'SubscriptionConfirmation': {
            console.log(`confirming endpoint subscription: ${subscriptionId}: ${webhookUrl}`);

            // Confirm the subscription
            request.get(
              message.SubscribeURL as string,
              (error, response) => {
                if (error) {
                  cb(error);
                } else {
                  // TODO: put the confirmed subscription arn in the subscription arns table
                  console.log(response);
                  cb(null, createResponse(204));
                }
              }
            );
            break;
          }

          case 'Notification': {
            const sns: SNSMessage = parsedBody as SNSMessage;

            // TODO: put the webhook notification in an SQS queue
            console.log('received SNS notification', sns);
            break;
          }

          default: {
            console.log('unhandled notification type', event);
            cb(null, createResponse(204));
            break;
          }
        }
      }
    }
  );

};
