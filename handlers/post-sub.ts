import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud, Subscription } from './util/subscription-crud';
import * as Joi from 'joi';
import subscribeToTopics from './util/subscribe-to-topics';
import { SubscriptionPostRequest } from './models';
import uuid = require('uuid');

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) {
    throw new Error('invalid caller');
  }

  const { requestContext: { authorizer: { user } } } = event as any;
  const { body } = event;

  if (!body) {
    cb(new Error('no body'));
    return;
  }

  if (!user) {
    cb(new Error('no user'));
    return;
  }

  let parsed: object;
  try {
    console.log('attempting to parse subscription');
    parsed = JSON.parse(body);
  } catch (error) {
    cb(error);
    return;
  }

  // validate the request
  const validationResult = Joi.validate(parsed, SubscriptionPostRequest);

  if (validationResult.error) {
    cb(
      null,
      {
        statusCode: 422,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS support to work
          'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(validationResult.error)
      }
    );
    return;
  }

  const subscription = validationResult.value as Subscription;

  const id = uuid.v4();
  const snsSubs = await subscribeToTopics(id, subscription.logic, subscription.webhookUrl);
  const saved = await crud.create(id, subscription, user, snsSubs);

  cb(
    null,
    {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
      },
      body: JSON.stringify(saved)
    }
  );
};
