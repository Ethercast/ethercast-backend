import 'source-map-support/register';
import crud from '../util/subscription-crud';
import * as Joi from 'joi';
import { Subscription, JoiSubscriptionPostRequest } from '../util/models';
import { default as createApiGatewayHandler, simpleError } from '../util/create-api-gateway-handler';
import getFilterCombinations from '../util/get-filter-combinations';
import { NOTIFICATION_TOPIC_NAME } from '../util/env';
import * as SNS from 'aws-sdk/clients/sns';
import logger from '../util/logger';

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

    // TODO: this is idempotent so it's totally OK, but we shouldn't need to make this request
    const { TopicArn } = await sns.createTopic({ Name: NOTIFICATION_TOPIC_NAME }).promise();

    if (!TopicArn) {
      logger.error({ TopicName: NOTIFICATION_TOPIC_NAME }, 'failed to create topic arn');
      throw new Error(`failed to create TopicArn`);
    }

    sns.subscribe({
      Protocol: 'lambda',
      TopicArn,
      Endpoint: ''
    });

    // save the new subscription
    const saved = await crud.create(subscription, user);

    return {
      statusCode: 200,
      body: saved
    };
  }
);