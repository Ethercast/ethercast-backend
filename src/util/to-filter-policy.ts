import { FilterOptionValue, LogSubscriptionFilters, TransactionSubscriptionFilters } from '@ethercast/backend-model';
import _ = require('underscore');

type FilterPolicy = {
  [key: string]: string[];
};

export default function toFilterPolicy(filter: LogSubscriptionFilters | TransactionSubscriptionFilters): FilterPolicy {
  return _.mapObject(
    _.omit(filter, (value: FilterOptionValue) => value === null),
    value => {
      if (typeof value === 'string') {
        return [ value.toLowerCase() ];
      } else {
        return value.map((v: string) => v.toLowerCase());
      }
    }
  );
}