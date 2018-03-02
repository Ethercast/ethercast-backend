import crud from '../util/subscription-crud';
import { default as createApiGatewayHandler } from '../util/create-api-gateway-handler';

export const handle = createApiGatewayHandler(
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);