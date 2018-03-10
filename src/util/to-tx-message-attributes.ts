import { Transaction } from '@ethercast/model';
import { MessageAttributeMap, MessageAttributeValue } from 'aws-sdk/clients/sns';
import { TransactionFilterType } from '@ethercast/backend-model';
import _ = require('underscore');

function messageAttributeValue(str: string | null): MessageAttributeValue | null {
  return str !== null ? {
    DataType: 'String',
    StringValue: str.toLowerCase()
  } : null;
}

export default function toTxMessageAttributes(transaction: Transaction): MessageAttributeMap {
  return _.omit(
    {
      [ TransactionFilterType.from ]: messageAttributeValue(transaction.from),
      [ TransactionFilterType.to ]: messageAttributeValue(transaction.to)
    },
    (v: MessageAttributeValue | null) => v === null
  );
}