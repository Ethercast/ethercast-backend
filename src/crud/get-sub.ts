import 'source-map-support/register';
import crud from '../util/subscription-crud';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';

export const SUBSCRIPTION_NOT_FOUND = simpleError(404, 'Subscription not found!');

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