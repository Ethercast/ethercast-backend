import { FilterOptionValue, JoiLogFilter, LogSubscriptionFilters } from '@ethercast/backend-model';
import { DecodedLog } from '@ethercast/model';
import { Abi } from '../../../blockstream/src/etherscan/etherscan-model';
import getAbi from '../../../blockstream/src/util/abi/get-abi';
import createApiGatewayHandler from '../util/create-api-gateway-handler';

function mapFilterValue<T>(val: FilterOptionValue | undefined, mapper: (v: string) => T): T[] {
  return val ? (Array.isArray(val) ? val.map(mapper) : [ mapper(val) ]) : [];
}

interface AddressWithAbi {
  address: string;
  abi: Abi | null;
}

export const handle = createApiGatewayHandler(
  [],
  async ({ body, user }) => {
    const { value, error } = JoiLogFilter.validate(body, { allowUnknown: true });

    if (error) {
      return {
        statusCode: 422,
        body: {
          message: 'There was a validation error with your log filters',
          error
        }
      };
    }

    const filters: LogSubscriptionFilters = value as any;

    const { address, topic0, topic1, topic2, topic3 } = filters;

    const abis: AddressWithAbi[] = await Promise.all(
      mapFilterValue<Promise<AddressWithAbi>>(
        address,
        address =>
          getAbi(address).then(abi => ({ abi, address }))
      )
    );

    const example: DecodedLog = {
      logIndex: '0x0',
      blockNumber: '0x0',
      blockHash: '0x0',
      transactionHash: '0x0',
      transactionIndex: '0x0',
      address: '0x0',
      data: '0x0',
      topics: [ '0x0' ],
      removed: false,
      ethercast: {
        eventName: 'event',
        parameters: {
          fakeParameter: 'abc'
        }
      }
    };

    return {
      statusCode: 200,
      body: example
    };
  }
);