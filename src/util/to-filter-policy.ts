import { FilterOptionValue, FilterType, SubscriptionFilters } from './models';
import _ = require('underscore');

export default function toFilterPolicy(filter: SubscriptionFilters): Partial<{[filterType in FilterType]: string[]}> {
  return _.mapObject(
    _.omit(filter, (value: FilterOptionValue) => value === null),
    value => {
      if (typeof value === 'string') {
        return [value.toLowerCase()];
      } else {
        return value.map((v: string) => v.toLowerCase());
      }
    }
  );
}