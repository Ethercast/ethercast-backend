import { Log } from '@ethercast/model';
import { MessageAttributeMap, String } from 'aws-sdk/clients/sns';
import { FilterType } from './crud/util/subscription-crud';

export default function toMessageAttributes(log: Log): MessageAttributeMap {
  return {
    [FilterType.address]: {
      DataType: 'String',
      StringValue: log.address
    },
    [FilterType.topic0]: {
      DataType: 'String',
      StringValue: log.topics[0]
    }
    // TODO: encode the rest of the topics too
  };
}