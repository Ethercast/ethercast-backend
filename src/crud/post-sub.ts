import { crud, Subscription } from '../util/subscription-crud';
import * as Joi from 'joi';
import { SubscriptionPostRequest } from '../util/models';
import { default as createProxyHandler, errorResponse } from '../util/create-handler';
import logger from '../util/logger';

export const handle = createProxyHandler(
  async (event) => {
    // TODO: abstract this repetitive junk out of the handle calls
    const { requestContext: { authorizer: { user } } } = event as any;

    let parsed: object;
    try {
      parsed = JSON.parse(event.body || '');
    } catch (err) {
      logger.info({ err }, `failed parsing post request`);
      return errorResponse(400, `invalid request body`);
    }

    // validate the request
    const { error, value } = Joi.validate(parsed, SubscriptionPostRequest, { convert: true });

    if (error && error.details.length) {
      return {
        statusCode: 422,
        body: {
          message: 'A validation error occurred',
          error
        }
      };
    }

    // save the new subscription
    const subscription = value as Subscription;
    const saved = await crud.create(subscription, user);

    return {
      statusCode: 200,
      body: saved
    };
  }
);