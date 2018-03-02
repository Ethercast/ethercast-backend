import 'source-map-support/register';
import { default as createApiGatewayHandler } from '../util/create-api-gateway-handler';
import { DocumentClient } from 'aws-sdk/lib/dynamodb/document_client';
import SubscriptionCrud from '../util/subscription-crud';

const crud = new SubscriptionCrud({ client: new DocumentClient() });

export const handle = createApiGatewayHandler(
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);