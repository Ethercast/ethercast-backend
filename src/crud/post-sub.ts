import 'source-map-support/register';
import crud from '../util/subscription-crud';
import * as Joi from 'joi';
import { Subscription, JoiSubscriptionPostRequest } from '../util/models';
import { default as createApiGatewayHandler, simpleError } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';
import { NOTIFICATION_LAMBDA_ARN, NOTIFICATION_TOPIC_ARN } from '../util/env';
import * as Lambda from 'aws-sdk/clients/Lambda';
import * as SNS from 'aws-sdk/clients/sns';
import logger from '../util/logger';
import toFilterPolicy from '../util/to-filter-policy';

const lambda = new Lambda();
const sns = new SNS();

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
      return simpleError(
        400,
        'Firehose log filters are not yet supported. Sorry, you must select at least one filter.'
      );
    } else if (filterCombinations > 100) {
      return simpleError(
        400,
        'We cannot support filters with greater than 100 combinations. Please create multiple filters for your use case.'
      );
    }

    try {
      // a lambda arn may only be subscribed to a topic once, so publish a new version/arn
      const { FunctionArn } = await lambda.publishVersion({
        FunctionName: NOTIFICATION_LAMBDA_ARN
      }).promise();

      if (!FunctionArn) {
        throw new Error('function failed to publish');
      }

      const { SubscriptionArn } = await sns.subscribe({
        Protocol: 'lambda',
        TopicArn: NOTIFICATION_TOPIC_ARN,
        Endpoint: FunctionArn
      }).promise();

      if (!SubscriptionArn) {
        throw new Error('subscription ARN not received after subscribing!');
      }

      subscription.subscriptionArn = SubscriptionArn;
    } catch (err) {
      logger.error({ err }, 'failed to subscribe to topic');

      throw err;
    }

    try {
      await sns.setSubscriptionAttributes({
        AttributeName: 'FilterPolicy',
        SubscriptionArn: subscription.subscriptionArn,
        AttributeValue: JSON.stringify(toFilterPolicy(subscription.filters))
      }).promise();
    } catch (err) {
      logger.error({ err }, 'failed to set subscription attributes');

      // try to remove them
      await sns.unsubscribe({ SubscriptionArn: subscription.subscriptionArn }).promise();

      throw err;
    }

    // save the new subscription
    const saved = await crud.create(subscription, user);

    return {
      statusCode: 200,
      body: saved
    };
  }
);
