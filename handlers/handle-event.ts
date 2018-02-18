import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import * as request from 'request';
import createResponse from './util/create-response';

export const handle: Handler = (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid call');
  }

  const {
    headers: {
      'x-amz-sns-message-id': snsMessageId,
      'x-amz-sns-message-type': snsMessageType,
      'x-amz-sns-topic-arn': snsTopicArn
    },
    queryStringParameters
  } = event;

  console.log('event', JSON.stringify(event), 'context', JSON.stringify(context));

  if (!queryStringParameters) {
    throw new Error('missing query string parameters from the request');
  }

  const { webhookUrl, subscriptionId } = queryStringParameters;
  if (!webhookUrl || !subscriptionId) {
    throw new Error('missing either webhookUrl or subscriptionId from the query string parameters');
  }

  if (snsMessageId && snsMessageType && snsTopicArn) {
    console.log(
      `subscribing endpoint ${webhookUrl} to ${snsTopicArn} for subscription ${subscriptionId}`
    );
    /**
     "eb288f56-861c-4fe7-9ea0-2473d8d7f845"
     Signature
     :
     "crgx3PxloOiUX447MO7M6Eh/iwNrwvs2bLQhSE/QJXc6hJq7+Qq1mqbDVOBjcVu0G8tTu9bWUIgOcWsQqp8R9/x6SzBBjcWZVxElwy8cqZGk9vccOFxP0T5z92aRTldOiudJYNt2L0X+X95excmloTDgVrpZ9d1a0NJjzQ4N9eDCdSOKW+Ub7iasY4umYVE1Ovdln/dhCObZBwiRShunnRThj+XziV055wGCpEjA7W82pHN1EW7cY8lusMhR55nZA4I3w8C/eOppofquOZVZBs0Z6cixyXaDrrOiBPLsvjqXJHqGALuyXRN+9mWCJfh2GnTDOpMoNbFvik7lUPTFyA=="
     SignatureVersion
     :
     "1"
     SigningCertURL
     :
     "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-433026a4050d206028891664da859041.pem"
     SubscribeURL
     :
     "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:135461455689:sub-c85d05177d3b14c7f00f236d39e5227c0e2fbd7216d4848336ec51498edf7edf&Token=2336412f37fb687f5d51e6e241da92fd7761b0c7f8439abaf9826632d0a71f8baecd9317491bc4e4425786982ceccc144a4fd0b41f85580890db48aa1c8b1e6f6676625cee5f4379116d9f42b8e84a07b94b3d95b7fbf1a9b1c76802c00356b20b72effc9782400da6a7e92e1ce4aa0ccce152e6981f6898130c22b9ded8c41ea1a343a4715b064d9d40d887742736bce5ac8ea671849c1a6a822b9e323de54a0af70878de555467a9fcab8477d0fabb"
     Timestamp
     :
     "2018-02-18T00:23:19.202Z"
     Token
     :
     "2336412f37fb687f5d51e6e241da92fd7761b0c7f8439abaf9826632d0a71f8baecd9317491bc4e4425786982ceccc144a4fd0b41f85580890db48aa1c8b1e6f6676625cee5f4379116d9f42b8e84a07b94b3d95b7fbf1a9b1c76802c00356b20b72effc9782400da6a7e92e1ce4aa0ccce152e6981f6898130c22b9ded8c41ea1a343a4715b064d9d40d887742736bce5ac8ea671849c1a6a822b9e323de54a0af70878de555467a9fcab8477d0fabb"
     TopicArn
     :
     "arn:aws:sns:us-east-1:135461455689:sub-c85d05177d3b14c7f00f236d39e5227c0e2fbd7216d4848336ec51498edf7edf"
     Type
     :
     "SubscriptionConfirmation"
     * @type {any}
     */
    const { Message, Signature, SignatureVersion, SubscribeURL, Timestamp, TopicArn, Type } = JSON.parse((event as any).body);

    console.log(`Hitting endpoint to subscribe to ${TopicArn}: ${SubscribeURL}`);

    // Confirm the subscription
    request.get(
      SubscribeURL as string,
      (error, response) => {
        if (error) {
          cb(error);
        } else {
          // TODO: put the confirmed subscription arn in the sub table
          console.log(response);
          cb(null, createResponse(204));
        }
      }
    );
  } else {
    // TODO: put an logs in the SQS queue for pushing webhooks
    throw new Error('pushing to sqs notification queue not implemented!');
  }
};
