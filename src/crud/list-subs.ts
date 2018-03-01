import { crud } from '../util/subscription-crud';
import { default as createProxyHandler, UNAUTHORIZED } from '../util/create-handler';

export const handle = createProxyHandler(
  async (event) => {
    const { requestContext: { authorizer: { user } } } = event as any;

    if (!user) {
      return UNAUTHORIZED;
    }

    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);