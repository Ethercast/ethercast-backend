import createApiGatewayHandler from '../util/create-api-gateway-handler';
import ApiKeyCrud from '../util/api-key-crud';
import logger from '../util/logger';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { Scope } from '@ethercast/backend-model';

const crud = new ApiKeyCrud({ client: new DynamoDB.DocumentClient(), logger });

export const handle = createApiGatewayHandler(
  [ Scope.READ_API_KEY ],
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);
