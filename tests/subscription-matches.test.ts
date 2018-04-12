import subscriptionMatches from '../src/util/subscription-matches';
import { expect } from 'chai';
import { Subscription } from '@ethercast/backend-model';

describe('#subscriptionMatches', () => {
  it('matches if we fail to parse message', () => {
    expect(subscriptionMatches({} as any, "{}")).to.be.true;
  });
});