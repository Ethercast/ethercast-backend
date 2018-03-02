import 'source-map-support/register';
import crud from '../util/subscription-crud';
import { BAD_REQUEST, default as createApiGatewayHandler } from '../util/create-api-gateway-handler';
import { SUBSCRIPTION_NOT_FOUND } from './get-sub';

export const handle = createApiGatewayHandler(
  async ({ pathParameters: { id }, user }) => {
    if (!id) {
      return BAD_REQUEST;
    }

    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    const receipts = await crud.listReceipts(subscription.id);

    return {
      statusCode: 200,
      body: receipts
    };
  }
);