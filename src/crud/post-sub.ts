import 'source-map-support/register';
import {
  JoiSubscriptionPostRequest, LogSubscription, Subscription, SubscriptionPostRequest,
  SubscriptionType, TransactionSubscription, TransactionSubscriptionFilters
} from '../util/models';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';
import logger from '../util/logger';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import { LOG_NOTIFICATION_TOPIC_NAME, SEND_WEBHOOK_LAMBDA_NAME, TX_NOTIFICATION_TOPIC_NAME } from '../util/env';
import SubscriptionCrud from '../util/subscription-crud';
import * as uuid from 'uuid';
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
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger });
const subscriptionUtil = new SnsSubscriptionUtil({ logger, lambda, sns });

const TOPIC_NAME_MAP = {
  [SubscriptionType.log]: LOG_NOTIFICATION_TOPIC_NAME,
  [SubscriptionType.transaction]: TX_NOTIFICATION_TOPIC_NAME
};

export const handle = createApiGatewayHandler(
  async ({ user, parsedBody }) => {
    // validate the request
    const { error, value } = JoiSubscriptionPostRequest.validate(parsedBody);

    if (error || !value) {
      return {
        statusCode: 422,
        body: {
          message: 'The request is not valid. Please correct any errors and try again.',
          error
        }
      };
    }

    const request = value as SubscriptionPostRequest;

    // validate that it has less than 100 combinations
    const filterCombinations = getFilterCombinations(request.filters);

    if (filterCombinations === 0) {
      return FIREHOSE_NOT_ALLOWED;
    } else if (filterCombinations > 100) {
      return TOO_MANY_COMBINATIONS;
    }

    const subscriptionId = uuid.v4();

    let subscriptionArn: string;
    try {
      // a lambda arn may only be subscribed to a topic once, so publish a new version/arn
      subscriptionArn = await subscriptionUtil.createSNSSubscription(
        SEND_WEBHOOK_LAMBDA_NAME,
        TOPIC_NAME_MAP[request.type],
        subscriptionId,
        request.filters
      );

    } catch (err) {
      logger.error({ err }, 'failed sns/lambda calls');

      throw err;
    }

    try {
      let sub: Subscription;

      if (request.type === SubscriptionType.log) {
        sub = {
          ...request,
          id: subscriptionId,
          subscriptionArn,
          user
        } as LogSubscription;
      } else if (request.type === SubscriptionType.transaction) {
        sub = {
          ...request,
          id: subscriptionId,
          subscriptionArn,
          user
        } as TransactionSubscription;
      } else {
        throw new Error('unknown subscription type');
      }

      const saved = await crud.save(sub);

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
