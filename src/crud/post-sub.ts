import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud, Subscription } from './util/subscription-crud';
import * as Joi from 'joi';
import { SubscriptionPostRequest } from './util/models';
import createResponse from './util/create-response';

export const handle: Handler = async (event: APIGatewayEvent, context: Context, cb?: Callback) => {
  if (!cb) throw new Error('invalid caller');

  const { requestContext: { authorizer: { user } } } = event as any;
  if (!user) return cb(new Error('no user'));

  const { body } = event;
  if (!body) return cb(new Error('no body'));


  let parsed: object;
  try {
    console.log('attempting to parse subscription');
    parsed = JSON.parse(body);
  } catch (error) {
    return cb(error);
  }

  // validate the request
  const validationResult = Joi.validate(parsed, SubscriptionPostRequest, { convert: true });

  if (validationResult.error) return cb(null, createResponse(422, validationResult.error));

  // save the new subscription
  const subscription = validationResult.value as Subscription;
  const saved = await crud.create(subscription, user);

  cb(null, createResponse(200, saved));
};
