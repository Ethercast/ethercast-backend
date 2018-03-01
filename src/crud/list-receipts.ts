import { crud } from '../util/subscription-crud';
import { BAD_REQUEST, default as createProxyHandler, errorResponse } from '../util/create-handler';

export const handle = createProxyHandler(
  async (event) => {

    const { pathParameters } = event;
    if (!pathParameters) {
      return BAD_REQUEST;
    }

    const { id } = pathParameters;
    if (!id) {
      return BAD_REQUEST;
    }

    const subscription = await crud.get(id);
    if (!subscription || !event.requestContext.authorizer || subscription.user !== event.requestContext.authorizer.user) {
      return errorResponse(404, 'Invalid subscription ID');
    }

    const receipts = await crud.listReceipts(subscription.id);

    return {
      statusCode: 200,
      body: receipts
    };
  }
);