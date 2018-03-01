import { crud } from '../util/subscription-crud';
import { BAD_REQUEST, default as createProxyHandler, errorResponse, UNAUTHORIZED } from '../util/create-handler';
import logger from '../util/logger';

export const handle = createProxyHandler(
  async (event) => {
    if (!event.pathParameters || !event.pathParameters.id) {
      return BAD_REQUEST;
    }

    if (!event.requestContext.authorizer || !event.requestContext.authorizer.user) {
      return UNAUTHORIZED;
    }

    const subscription = await crud.get(event.pathParameters.id);

    if (!subscription || subscription.user !== event.requestContext.authorizer.user) {
      return errorResponse(
        404,
        'Invalid subscription ID'
      );
    }

    await crud.deactivate(subscription.id);
    logger.info({ subscription }, `deactivated subscription`);

    return { statusCode: 204 };
  }
);