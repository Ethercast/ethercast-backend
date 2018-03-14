import {
  CreateLogSubscriptionRequest,
  CreateTransactionSubscriptionRequest,
  JoiCreateSubscriptionRequest,
  Scope
} from '@ethercast/backend-model';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';
import logger from '../util/logger';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import SubscriptionCrud from '../util/subscription-crud';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SNS from 'aws-sdk/clients/sns';

const TOO_MANY_COMBINATIONS = simpleError(
  400,
  'We cannot support filters with greater than 100 combinations. Please create multiple filters for your use case.'
);

const FIREHOSE_NOT_ALLOWED = simpleError(
  400,
  'Firehose log filters are not yet supported. Sorry, you must select at least one filter.'
);

const sns = new SNS();
const lambda = new Lambda();
const subscriptionUtil = new SnsSubscriptionUtil({ logger, lambda, sns });
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger, subscriptionUtil });

export const handle = createApiGatewayHandler(
  [ Scope.CREATE_SUBSCRIPTION ],
  async ({ user, parsedBody }) => {
    // validate the request
    const { error, value } = JoiCreateSubscriptionRequest.validate(parsedBody);

    if (error || !value) {
      return {
        statusCode: 422,
        body: {
          message: 'The request is not valid. Please correct any errors and try again.',
          error
        }
      };
    }

    const request: CreateTransactionSubscriptionRequest | CreateLogSubscriptionRequest = value as any;

    // validate that it has less than 100 combinations
    const filterCombinations = getFilterCombinations(request.filters);

    if (filterCombinations === 0) {
      return FIREHOSE_NOT_ALLOWED;
    } else if (filterCombinations > 100) {
      return TOO_MANY_COMBINATIONS;
    }

    try {
      const saved = await crud.create(request, user);

      return {
        statusCode: 200,
        body: saved
      };
    } catch (err) {
      logger.error({ err }, 'failed to save subscription');

      return simpleError(500, 'Failed to save subscription.');
    }
  }
);
