import { Log } from '@ethercast/model';
import { MessageAttributeMap, MessageAttributeValue } from 'aws-sdk/clients/sns';
import { LogFilterType } from '@ethercast/backend-model';
import _ = require('underscore');

function messageAttributeValue(str: string | null): MessageAttributeValue | null {
  return str !== null ? {
    DataType: 'String',
    StringValue: str.toLowerCase()
  } : null;
}

export default function toLogMessageAttributes(log: Log): MessageAttributeMap {
  function topicIndex(index: number) {
    if (log.topics && log.topics.length > index) {
      return messageAttributeValue(log.topics[ index ]);
    } else {
      return null;
    }
  }

  return _.omit(
    {
      [ LogFilterType.address ]: messageAttributeValue(log.address),
      [ LogFilterType.topic0 ]: topicIndex(0),
      [ LogFilterType.topic1 ]: topicIndex(1),
      [ LogFilterType.topic2 ]: topicIndex(2),
      [ LogFilterType.topic3 ]: topicIndex(3)
    },
    (v: MessageAttributeValue | null) => v === null
  );
}