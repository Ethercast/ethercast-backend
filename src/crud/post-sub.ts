import 'source-map-support/register';
import { JoiSubscriptionPostRequest, Subscription } from '../util/models';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';
import logger from '../util/logger';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import { NOTIFICATION_LAMBDA_NAME, NOTIFICATION_TOPIC_NAME } from '../util/env';
import uuid = require('uuid');
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SNS from 'aws-sdk/clients/sns';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import SubscriptionCrud from '../util/subscription-crud';

const TOO_MANY_COMBINATIONS = simpleError(
  400,
  'We cannot support filters with greater than 100 combinations. Please create multiple filters for your use case.'
);

const FIREHOSE_NOT_ALLOWED = simpleError(
  400,
  'Firehose log filters are not yet supported. Sorry, you must select at least one filter.'
);

const crud = new SubscriptionCrud({ client: new DocumentClient() });

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

    const subscription = value as Subscription;

    // validate that it has less than 100 combinations
    const filterCombinations = getFilterCombinations(subscription.filters);

    if (filterCombinations === 0) {
      return FIREHOSE_NOT_ALLOWED;
    } else if (filterCombinations > 100) {
      return TOO_MANY_COMBINATIONS;
    }

    const subscriptionUtil = new SnsSubscriptionUtil({ lambda: new Lambda(), sns: new SNS() });

    subscription.id = uuid.v4();

    try {
      // a lambda arn may only be subscribed to a topic once, so publish a new version/arn
      subscription.subscriptionArn = await subscriptionUtil.createSNSSubscription(
        NOTIFICATION_LAMBDA_NAME,
        NOTIFICATION_TOPIC_NAME,
        subscription.id,
        subscription.filters
      );
    } catch (err) {
      logger.error({ err }, 'failed sns/lambda calls');

      throw err;
    }

    try {
      const saved = await crud.save(subscription, user);

      return {
        statusCode: 200,
        body: saved
      };
    } catch (err) {
      logger.error({ err }, 'failed to save subscription');

      throw err;
    }
  }
);
