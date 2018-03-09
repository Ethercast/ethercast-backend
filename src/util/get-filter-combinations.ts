import { LogSubscriptionFilters, TransactionSubscriptionFilters } from './models';
import * as _ from 'underscore';

export default function getFilterCombinations(filters: LogSubscriptionFilters | TransactionSubscriptionFilters) {
  const filterCounts: (number | null)[] = _.map(
    filters,
    values => {
      return typeof values === 'undefined' || values === null ? null : (
        typeof values === 'string' ? 1 : values.length
      );
    }
  );

  const withoutNull: number[] = _.filter(filterCounts, f => f !== null) as number[];

  if (withoutNull.length === 0) {
    return 0;
  }

  return _.reduce(
    withoutNull,
    (prev, curr) => prev * curr,
    1
  );
}
