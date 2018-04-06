import ApiKeyCrud from '../util/api-key-crud';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import logger from '../util/logger';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { Scope } from '@ethercast/backend-model';

const crud = new ApiKeyCrud({ client: new DynamoDB.DocumentClient(), logger });

export const handle = createApiGatewayHandler(
  [ Scope.DEACTIVATE_API_KEY ],
  async ({ pathParameters: { id }, user }) => {
    const key = await crud.get(id);

    if (!key || key.user !== user) {
      return simpleError(
        404,
        'Api key not found!'
      );
    }

    logger.info({ key }, 'unsubscribed api key');

    const saved = await crud.deactivate(key.id);

    logger.info({ key }, `deactivated api key `);

    return { statusCode: 200 };
  }
);
