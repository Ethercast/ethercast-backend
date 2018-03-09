import { JoiSubscriptionPostRequest, Subscription, SubscriptionType } from '../src/util/models';
import { expect } from 'chai';

describe('JoiSubscriptionPostRequest#validate', () => {
  function v(o: any | Partial<Subscription>) {
    expect(JoiSubscriptionPostRequest.validate(o).error).to.eq(null, `validation should have succeeded: ${JSON.stringify(o)}`);
  }

  function iv(o: any | Partial<Subscription>) {
    expect(JoiSubscriptionPostRequest.validate(o).error).to.not.eq(null, `validation should have failed: ${JSON.stringify(o)}`);
  }

  it('filters invalid requests', () => {
    iv(null);
    iv({});
    iv({ type: SubscriptionType.log, user: 'abc' });
    iv({ name: 'moody test' });
    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: '123'
    });
    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: '123',
      filters: {}
    });
    iv({
      name: '',
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {}
    });
    iv({
      name: null,
      description: null,
      webhookUrl: 'https://google.com',
      filters: {}
    });
    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'red green',
      webhookUrl: 'ftp://not-google.com',
      filters: {}
    });
    iv({
      name: 'moody test',
      description: 'red green',
      webhookUrl: 'not-google.com',
      filters: {
        notfilter: 'abc'
      }
    });
    iv({
      name: 'moody test',
      description: 'red green',
      webhookUrl: 'http://google.com',
      filters: {
        notfilter: ['abc']
      }
    });


    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['abc', 'def']
      }
    });
    iv({
      name: 'moody test',
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['abc']
      }
    });
    iv({
      name: 'moody test',
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: null,
        topic0: 'abc'
      }
    });
    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: null,
        topic0: ['abc', 'def']
      }
    });

    iv({
      name: 'moody test',
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: null,
        // address doesn't work in the topic
        topic0: '0x06012c8cf97bead5deae237070f9587f8e7a266d'
      }
    });
  });

  it('fails with wrong filter types', () => {
    iv({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        from: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf'],
        topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      }
    });

    iv({
      name: 'moody test',
      type: SubscriptionType.transaction,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf'],
        topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      }
    });
  });

  it('works with valid transaction filter requests', () => {
    v({
      name: 'moody test',
      type: SubscriptionType.transaction,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {}
    });

    v({
      name: 'moody test',
      type: SubscriptionType.transaction,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        from: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf']
      }
    });

    v({
      name: 'moody test',
      type: SubscriptionType.transaction,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        to: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf']
      }
    });
    v({
      name: 'moody test',
      type: SubscriptionType.transaction,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        from: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf'],
        to: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf']
      }
    });
  });

  it('works with valid log filter requests', () => {
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {}
    });
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {}
    });
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['0x06012c8cf97bead5deae237070f9587f8e7a266d']
      }
    });
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf']
      }
    });
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: '0x06012c8cf97bead5deae237070f9587f8e7a266d'
      }
    });
    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: null
      }
    });

    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: null,
        topic0: '0x0000000000000000000000007891f796a5d43466fc29f102069092aef497a290'
      }
    });

    v({
      name: 'moody test',
      type: SubscriptionType.log,
      description: 'abc',
      webhookUrl: 'https://google.com',
      filters: {
        address: ['0x06012c8cf97bead5deae237070f9587f8e7a266d', '0xed3ece085efe6687a32075531b6b0a45f99eccdf'],
        topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      }
    });
  });
});