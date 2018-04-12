import { LogSubscription, Subscription, SubscriptionType, TransactionSubscription } from '@ethercast/backend-model';
import { JoiLog, JoiTransaction, Log, Transaction } from '@ethercast/model';
import { MessageAttributeMap } from 'aws-sdk/clients/sns';
import toTxMessageAttributes from './to-tx-message-attributes';
import toLogMessageAttributes from './to-log-message-attributes';
import toFilterPolicy, { FilterPolicy } from './to-filter-policy';
import * as _ from 'underscore';

function isTransactionSubscription(sub: Subscription): sub is TransactionSubscription {
  return sub.type === SubscriptionType.transaction;
}

function isLogSubscription(sub: Subscription): sub is LogSubscription {
  return sub.type === SubscriptionType.log;
}

function isTransaction(parsed: any): parsed is Transaction {
  return JoiTransaction.validate(parsed).error === null;
}

function isLog(parsed: any): parsed is Log {
  return JoiLog.validate(parsed).error === null;
}

function messageAttributesMatchFilterPolicy(messageAttributes: MessageAttributeMap, filterPolicy: FilterPolicy): boolean {
  return _.all(
    filterPolicy,
    (matchingValues, attribute) => {
      const messageAttribute = messageAttributes[ attribute ];

      if (!messageAttribute) {
        return false;
      }

      const { StringValue } = messageAttribute;

      if (!StringValue) {
        return false;
      }

      return (
        _.any(
          matchingValues,
          matchingValue => {
            return StringValue === matchingValue;
          }
        )
      );
    }
  );
}

export default function subscriptionMatches(sub: Subscription, message: string): boolean {
  let parsed: any;

  try {
    parsed = JSON.parse(message);
  } catch (err) {
    // if we cannot parse the message, assume it should be sent
    return true;
  }

  let messageAttributes: MessageAttributeMap;

  if (isTransactionSubscription(sub) && isTransaction(parsed)) {
    messageAttributes = toTxMessageAttributes(parsed);
  } else if (isLogSubscription(sub) && isLog(parsed)) {
    messageAttributes = toLogMessageAttributes(parsed);
  } else {
    return true;
  }

  const filterPolicy = toFilterPolicy(sub.filters);

  return messageAttributesMatchFilterPolicy(messageAttributes, filterPolicy);
}