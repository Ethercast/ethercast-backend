import toMessageAttributes from '../src/util/to-message-attributes';
import { FilterType } from '../src/util/models';
import { Log } from '@ethercast/model';
import { expect } from 'chai';

function fakeLog(address: string, ...topics: string[]): Log {
  return {
    address,
    topics
  } as Log;
}

describe('toMessageAttributes', () => {

  it('extracts attributes from logs', () => {
    expect(
      toMessageAttributes(fakeLog('abc', '123'))
    ).to.deep.eq({
      [FilterType.address]: {
        DataType: 'String',
        StringValue: 'abc'
      },
      [FilterType.topic0]: {
        DataType: 'String',
        StringValue: '123'
      }
    });
  });

});