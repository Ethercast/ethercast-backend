import 'source-map-support/register';
import createApiGatewayHandler from '../util/create-api-gateway-handler';
import SubscriptionCrud from '../util/subscription-crud';
import { DynamoDB } from 'aws-sdk';
import logger from '../util/logger';

const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger });

export const handle = createApiGatewayHandler(
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);