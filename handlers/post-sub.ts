import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import { crud, Subscription } from './util/subscription-crud';
import * as Joi from 'joi';
import subscribeToTopics from './util/subscribe-to-topics';

export const SubscriptionPostRequest = Joi.object().keys({
  name: Joi.string().min(3).max(256).required(),
  description: Joi.string().max(1024),
  logic: Joi.array()
    .items(
      Joi.array()
        .items(
          Joi.alternatives(
            [
              Joi.object().keys({
                type: Joi.string().only('address', 'topic0', 'topic1', 'topic2', 'topic3').required(),
                value: Joi.when(
                  Joi.ref('type'),
                  {
                    is: 'address',
                    then: Joi.string().regex(/^0x[0-9a-fA-F]{40}$/).required(),
                    otherwise: Joi.string().regex(/^0x[0-9a-f]{64}$/).required()
                  }
                )
              })
            ]
          )
        )
        .min(1)
        .max(10)
    )
    .required()
    .min(1)
    .max(10)
});

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

  const saved = await crud.create(subscription, user);

  // TODO: process the logic to add subscribers to all SNS topics
  const snsSubs = await subscribeToTopics(saved);

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
