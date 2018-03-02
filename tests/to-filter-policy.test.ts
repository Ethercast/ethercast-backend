import { FilterType } from '../src/util/models';
import { expect } from 'chai';
import toFilterPolicy from '../src/util/to-filter-policy';

describe('#toFilterPolicy', () => {

  it('array-ifies all items', () => {
    expect(
      toFilterPolicy({
        [FilterType.address]: 'abc'
      })
    ).to.deep.eq({
      [FilterType.address]: ['abc']
    });
  });

  it('downcases all attributes', () => {
    expect(
      toFilterPolicy({
        [FilterType.address]: 'aBc',
        [FilterType.topic0]: ['BaC']
      })
    ).to.deep.eq({
      [FilterType.address]: ['abc'],
      [FilterType.topic0]: ['bac']
    });
  });

});