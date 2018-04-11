import {
  FilterOptionValue,
  JoiSubscriptionLogFilter,
  JoiSubscriptionTransactionFilter,
  LogSubscriptionFilters,
  SubscriptionType,
  TransactionSubscriptionFilters
} from '@ethercast/backend-model';
import { DecodedLog, Log, Transaction } from '@ethercast/model';
import * as Lambda from 'aws-sdk/clients/lambda';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import * as Joi from 'joi';
import * as _ from 'underscore';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import { GET_ABIS_LAMBDA_NAME } from '../util/env';
import logger from '../util/logger';
import { Abi, ContractMember } from '../debt/etherscan-model';
import { createExampleLog, createExampleTransaction, EMPTY_LOG, EMPTY_TRANSACTION } from '../util/create-examples';

const lambda = new Lambda();

async function getAbis(addresses: string[]): Promise<{ [ address: string ]: Abi | null }> {
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


const RequestBody = Joi.object({
  type: Joi.string().valid(_.values(SubscriptionType)),
  filters: Joi.object().when(
    'type',
    {
      is: SubscriptionType.transaction,
      then: JoiSubscriptionTransactionFilter,
      otherwise: JoiSubscriptionLogFilter
    }
  )
});

interface Request {
  type: SubscriptionType
}

interface TransactionRequest extends Request {
  type: SubscriptionType.transaction,
  filters: TransactionSubscriptionFilters
}

interface LogRequest extends Request {
  type: SubscriptionType.log,
  filters: LogSubscriptionFilters
}

function toArray(value?: FilterOptionValue): string[] {
  if (typeof value === 'undefined' || value === null) {
    return [];
  } else if (typeof value === 'string') {
    return [ value ];
  } else {
    return value;
  }
}

export const handle = createApiGatewayHandler(
  [],
  async ({ body, user }) => {
    const { value, error } = RequestBody.validate(body);

    if (error) {
      return simpleError(400, `Invalid subscription request: ${error.message}`);
    }

    const request = value as any as TransactionRequest | LogRequest;

    switch (request.type) {
      case SubscriptionType.transaction: {
        const { filters: { methodSignature, from, to } } = request;

        const addresses = toArray(to);

        if (addresses.length === 0) {
          return { statusCode: 200, body: EMPTY_TRANSACTION };
        } else {
          const abis = await getAbis(addresses);

          return { statusCode: 200, body: createExampleTransaction(abis) };
        }
      }
      case SubscriptionType.log: {
        const { filters: { address, topic0 } } = request;

        const addresses = toArray(address);
        if (addresses.length === 0) {
          return { statusCode: 200, body: EMPTY_LOG };
        } else {
          const abis = await getAbis(addresses);

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