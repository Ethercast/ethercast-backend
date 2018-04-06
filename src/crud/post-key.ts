import {
  CreateApiKeyRequest,
  JoiCreateApiKeyRequest,
  Scope
} from '@ethercast/backend-model';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import logger from '../util/logger';
import ApiKeyCrud from '../util/api-key-crud';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';

const crud = new ApiKeyCrud({ client: new DynamoDB.DocumentClient(), logger });

export const handle = createApiGatewayHandler(
  [ Scope.CREATE_API_KEY ],
  async ({ user, parsedBody }) => {
    // validate the request
    const { error, value } = JoiCreateApiKeyRequest.validate(parsedBody);

    if (error || !value) {
      return {
        statusCode: 422,
        body: {
          message: 'The request is not valid. Please correct any errors and try again.',
          error
        }
      };
    }

    const request: CreateApiKeyRequest = value as any;

    try {
      const saved = await crud.create(request, user);

      return {
        statusCode: 200,
        body: saved
      };
    } catch (err) {
      logger.error({ err }, 'failed to save api key');

      return simpleError(500, 'Failed to save api key.');
    }
  }
);
