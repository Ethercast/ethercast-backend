import crud from '../util/subscription-crud';
import { default as createApiGatewayHandler, simpleError } from '../util/create-api-gateway-handler';
import logger from '../util/logger';

export const handle = createApiGatewayHandler(
  async ({ pathParameters: { id }, user }) => {

    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return simpleError(
        404,
        'Subscription not found!'
      );
    }

    await crud.deactivate(subscription.id);
    logger.info({ subscription }, `deactivated subscription`);

    return { statusCode: 204 };
  }
);