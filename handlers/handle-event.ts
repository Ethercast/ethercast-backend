import { APIGatewayEvent, Callback, Context, Handler, SNSMessage } from 'aws-lambda';
import * as MessageValidator from 'sns-validator';
import createResponse from './util/create-response';
import * as SNS from 'aws-sdk/clients/sns';
import { crud } from './util/subscription-crud';
import * as SQS from 'aws-sdk/clients/sqs';

const validator = new MessageValidator();
const sns = new SNS();

const sqs = new SQS();
sqs.config.region = 'us-east-1';

const { QUEUE_URL } = process.env;

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
    async (err: any, message: any) => {
      if (err) {
        console.log('failed to validate the sns message!', err);
        cb(err);
      } else {
        switch (message.Type) {
          case 'SubscriptionConfirmation': {
            console.log(`confirming endpoint subscription: ${subscriptionId}: ${webhookUrl}`, message);

            try {
              const { SubscriptionArn } = await sns.confirmSubscription({
                AuthenticateOnUnsubscribe: 'true',
                Token: message.Token,
                TopicArn: message.TopicArn
              }).promise();

              if (!SubscriptionArn) {
                throw new Error('invalid subscription arn');
              }

              // save the subscription arn record
              await crud.addSubscriptionArn(subscriptionId, SubscriptionArn);

              cb(null, createResponse(204));
            } catch (error) {
              console.error('failed to complete subscription', error);
              cb(error);
            }

            break;
          }

          case 'Notification': {
            console.log('handling notification', message);

            const snsMessage: SNSMessage = parsedBody as SNSMessage;

            const logEvent = JSON.parse(snsMessage.Message);

            try {
              await sqs.sendMessage({
                MessageDeduplicationId: `${subscriptionId}-${logEvent.log.transactionHash}-${logEvent.log.transactionLogIndex}`,
                QueueUrl: process.env.QUEUE_URL,
                MessageBody: JSON.stringify({
                  log: logEvent,
                  webhookUrl,
                  subscriptionId
                }),
                MessageGroupId: '1'
              });

              cb(null, createResponse(204));
            } catch (error) {
              console.error('failed to send message to sqs queue', error);
              cb(error);
            }

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
