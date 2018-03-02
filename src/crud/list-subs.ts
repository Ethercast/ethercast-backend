import 'source-map-support/register';
import createApiGatewayHandler from '../util/create-api-gateway-handler';
import SubscriptionCrud from '../util/subscription-crud';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';

const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient() });

export const handle = createApiGatewayHandler(
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);