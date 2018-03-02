import 'source-map-support/register';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';import SubscriptionCrud from '../util/subscription-crud';

export const SUBSCRIPTION_NOT_FOUND = simpleError(404, 'Subscription not found!');
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient() });

export const handle = createApiGatewayHandler(
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