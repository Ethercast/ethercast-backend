import { LogFilterType, TransactionFilterType } from '@ethercast/backend-model';
import { expect } from 'chai';
import toFilterPolicy from '../src/util/to-filter-policy';

describe('#toFilterPolicy', () => {

  it('array-ifies all items', () => {
    expect(
      toFilterPolicy({
        [ LogFilterType.address ]: 'abc'
      })
    ).to.deep.eq({
      [ LogFilterType.address ]: [ 'abc' ]
    });
  });

  it('downcases all attributes', () => {
    expect(
      toFilterPolicy({
        [ LogFilterType.address ]: 'aBc',
        [ LogFilterType.topic0 ]: [ 'BaC' ]
      })
    ).to.deep.eq({
      [ LogFilterType.address ]: [ 'abc' ],
      [ LogFilterType.topic0 ]: [ 'bac' ]
    });
  });

  it('works for transaction filter types', () => {
    expect(
      toFilterPolicy({
        [ TransactionFilterType.to ]: 'aBc',
        [ TransactionFilterType.methodSignature ]: [ 'BaC' ]
      })
    ).to.deep.eq({
      [ TransactionFilterType.to ]: [ 'abc' ],
      [ TransactionFilterType.methodSignature ]: [ 'bac' ]
    });
  });

});