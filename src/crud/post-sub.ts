import crud from '../util/subscription-crud';
import * as Joi from 'joi';
import { Subscription, JoiSubscriptionPostRequest } from '../util/models';
import { default as createApiGatewayHandler } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';

export const handle = createApiGatewayHandler(
  async ({ user, body }) => {
    // validate the request
    const { error, value } = Joi.validate(body, JoiSubscriptionPostRequest, { convert: true });

    if (error || !value) {
      return {
        statusCode: 422,
        body: {
          message: 'A validation error occurred',
          error
        }
      };
    }

    const subscription = value as Subscription;

    // validate that it has less than 100 combinations
    const filterCombinations = getFilterCombinations(subscription.filters);

    if (filterCombinations === 0) {
      return {
        statusCode: 400,
        body: {
          message: 'Firehose log filters are not yet supported. Sorry, you must select at least one filter.'
        }
      };
    } else if (filterCombinations > 100) {
      return {
        statusCode: 400,
        body: {
          message: 'We cannot support filters with greater than 100 combinations. Please create multiple filters for your use case.'
        }
      };
    }

    // save the new subscription
    const saved = await crud.create(subscription, user);

    return {
      statusCode: 200,
      body: saved
    };
  }
);