import { JoiSubscriptionPostRequest, Subscription } from '../src/util/models';
import { expect } from 'chai';

describe('JoiSubscriptionPostRequest', () => {
  function v(o: any | Partial<Subscription>) {
    expect(JoiSubscriptionPostRequest.validate({}).error).to.eq(null, 'validation should have succeeded');
  }

  function iv(o: any | Partial<Subscription>) {
    expect(JoiSubscriptionPostRequest.validate({}).error).to.not.eq(null, 'validation should have failed');
  }

  it('filters invalid requests', () => {
    iv(null);
    iv({});
    iv({ user: 'abc' });
    iv({ name: 'moody test' });
    iv({
      name: 'moody test',
      description: 'abc',
      webhookUrl: '123'
    });
  });

  it('works with valid requests', () => {
    v({
      name: 'moody test',
      description: 'abc',
      webhookUrl: '123',
      filters: {}
    });
  });
});