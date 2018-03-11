import { expect } from 'chai';

import { parseMessage, createMessage } from '../src/util/message-compressor';

describe('message-compressor#parseMessage,#createMessage', () => {
  it('works both ways', () => {
    expect(parseMessage(createMessage({ abc: '123' })))
      .to.deep.eq({ abc: '123' });
  });
});