import { expect } from 'chai';
import getFilterCombinations from '../src/util/get-filter-combinations';

describe('#getFilterCombinations', () => {
  it('empty object', () => {
    expect(getFilterCombinations({})).to.eq(0);
  });

  it('1 address', () => {
    expect(getFilterCombinations({
      address: 'abc'
    })).to.eq(1);
  });

  it('2 addresses', () => {
    expect(getFilterCombinations({
      address: ['abc', 'def']
    })).to.eq(2);
  });

  it('null address', () => {
    expect(getFilterCombinations({
      address: null
    })).to.eq(0);
  });

  it('multiple fields: total 1', () => {
    expect(getFilterCombinations({
      address: null,
      topic0: 'abc'
    })).to.eq(1);
  });

  it('multiple fields: total 2', () => {
    expect(getFilterCombinations({
      address: ['def', 'abc'],
      topic0: 'abc'
    })).to.eq(2);
  });

  it('multiple fields: total 6', () => {
    expect(getFilterCombinations({
      address: ['def', 'abc'],
      topic0: 'abc',
      topic3: ['def', 'gfd', 'cdef'],
      topic2: null
    })).to.eq(6);
  });

});