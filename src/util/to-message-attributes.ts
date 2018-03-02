import { Log } from '@ethercast/model';
import { MessageAttributeMap, MessageAttributeValue, String } from 'aws-sdk/clients/sns';
import { FilterType } from './models';
import _ = require('underscore');

function messageAttributeValue(str: string | null): MessageAttributeValue | null {
  return str !== null ? {
    DataType: 'String',
    StringValue: str.toLowerCase()
  } : null;
}

export default function toMessageAttributes(log: Log): MessageAttributeMap {
  function topicIndex(index: number) {
    if (log.topics && log.topics.length > index) {
      return messageAttributeValue(log.topics[index]);
    } else {
      return null;
    }
  }

  return _.omit(
    {
      [FilterType.address]: messageAttributeValue(log.address),
      [FilterType.topic0]: topicIndex(0),
      [FilterType.topic1]: topicIndex(1),
      [FilterType.topic2]: topicIndex(2),
      [FilterType.topic3]: topicIndex(3)
    },
    (v: MessageAttributeValue | null) => v === null
  );
}