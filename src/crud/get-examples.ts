import {
  GetExampleLogRequest,
  GetExampleTransactionRequest,
  JoiGetExampleRequest,
  SubscriptionType
} from '@ethercast/backend-model';
import * as Lambda from 'aws-sdk/clients/lambda';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import { GET_ABIS_LAMBDA_NAME } from '../util/env';
import logger from '../util/logger';
import { Abi } from '../debt/etherscan-model';
import { createExampleLog, createExampleTransaction, EMPTY_LOG, EMPTY_TRANSACTION } from '../util/create-examples';
import filterOptionValueToArray from '../util/filter-option-value-to-array';

const lambda = new Lambda();

async function getAbis(addresses: string[]): Promise<{ abis: { [ address: string ]: Abi | null } }> {
  const invocationRequest: InvocationRequest = {
    InvocationType: 'RequestResponse',
    FunctionName: GET_ABIS_LAMBDA_NAME,
    Payload: JSON.stringify({ addresses })
  };

  const { StatusCode, Payload } = await lambda.invoke(invocationRequest).promise();

  if (StatusCode !== 200) {
    throw new Error('Unexpected status code');
  }

  if (!Payload) {
    throw new Error('Missing payload');
  }

  return JSON.parse(Payload.toString());
}


export const handle = createApiGatewayHandler(
  [],
  async ({ body, user }) => {
    const { value, error } = JoiGetExampleRequest.validate(body);

    if (error) {
      return simpleError(400, `Invalid subscription request: ${error.message}`);
    }

    const request = value as any as GetExampleTransactionRequest | GetExampleLogRequest;

    switch (request.type) {
      case SubscriptionType.transaction: {
        const { filters: { to } } = request;

        // TODO: filter by methods that match the method signature of the request
        const addresses = filterOptionValueToArray(to);

        if (addresses.length === 0) {
          logger.debug({ addresses }, 'no addresses, returning empty transaction');

          return { statusCode: 200, body: EMPTY_TRANSACTION };
        } else {
          const { abis } = await getAbis(addresses);

          logger.debug({ addresses, abis }, 'fetched abis for addresses');

          return { statusCode: 200, body: createExampleTransaction(abis) };
        }
      }
      case SubscriptionType.log: {
        const { filters: { address } } = request;

        // TODO: filter by events matching topic0 of the request
        const addresses = filterOptionValueToArray(address);

        if (addresses.length === 0) {
          logger.debug('no addresses, returning empty log');

          return { statusCode: 200, body: EMPTY_LOG };
        } else {
          const { abis } = await getAbis(addresses);

          logger.debug({ addresses, abis }, 'fetched abis for addresses');

          return { statusCode: 200, body: createExampleLog(abis) };
        }
      }
      default: {
        logger.error({ request }, 'failed to get example');
        return simpleError(400, `Subscription type not supported`);
      }
    }
  }
);