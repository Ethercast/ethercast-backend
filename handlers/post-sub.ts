import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud, Subscription } from './util/subscription-crud';
import * as Joi from 'joi';
import subscribeToTopics from './util/subscribe-to-topics';
import { SubscriptionPostRequest } from './util/models';
import createResponse from './util/create-response';

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
      createResponse(422, validationResult.error)
    );
    return;
  }

  const subscription = validationResult.value as Subscription;

  const saved = await crud.create(subscription, user);

  // create SNS topics for the subscription
  await subscribeToTopics(saved);

  cb(null, createResponse(200, saved));
};
