import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import SubscriptionCrud from '../util/subscription-crud';
import logger from '../util/logger';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SNS from 'aws-sdk/clients/sns';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import { Scope } from '@ethercast/backend-model';

export const SUBSCRIPTION_NOT_FOUND = simpleError(404, 'Subscription not found!');

const subscriptionUtil = new SnsSubscriptionUtil({ logger, sns: new SNS(), lambda: new Lambda() });
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger, subscriptionUtil });

export const handle = createApiGatewayHandler(
  [ Scope.READ_SUBSCRIPTION ],
  async ({ pathParameters: { id }, user }) => {
    if (!id) {
      throw new Error('missing id in path');
    }

    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    return {
      statusCode: 200,
      body: subscription
    };
  }
);