import { generateTopics as otherGenerateTopics } from './util/get-log-topics';
import { generateTopics } from '../handlers/util/subscribe-to-topics';
import { ConditionType, SubscriptionLogic } from '../handlers/util/subscription-crud';
import { expect } from 'chai';
import _ = require('underscore');

const CRYPTO_KITTY_LOG = {
  address: '0x06012c8cf97bead5deae237070f9587f8e7a266d',
  topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
};

const snsTopicNames = otherGenerateTopics([CRYPTO_KITTY_LOG.address, ...CRYPTO_KITTY_LOG.topics]);

describe('generateTopics', () => {

  function matches(logic: SubscriptionLogic): void {
    expect(_.intersection(generateTopics(logic), snsTopicNames)).to.not.be.empty;
  }

  function notMatches(logic: SubscriptionLogic): void {
    expect(_.intersection(generateTopics(logic), snsTopicNames)).to.be.empty;
  }

  it('matches the cryptokitty log on address', () => {
    matches([
      [
        {
          type: ConditionType.address,
          value: '0x06012c8cf97bead5deae237070f9587f8e7a266d'
        }
      ]
    ]);
  });

  it('matches cryptokitty event on topic0', () => {
    matches([
      [
        {
          type: ConditionType.topic0,
          value: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        }
      ]
    ]);
  });

  it('matches cryptokitty on topic0', () => {
    matches([
      [
        {
          type: ConditionType.topic0,
          value: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        }
      ],
      [
        {
          type: ConditionType.address,
          value: '0x06012c8cf97bead5deae237070f9587f8e7a266d'
        }
      ]
    ]);
  });

  it('matches an or condition with topic0', () => {
    matches([
      [
        {
          type: ConditionType.topic0,
          value: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        },
        {
          type: ConditionType.topic1,
          value: 'abc123'
        }
      ]
    ]);
  });

  it('doesnt match on invalid address', () => {
    notMatches([
      [
        {
          type: ConditionType.address,
          value: '0x06012c8cf97bead5deae237070f9587f8e7a266f'
        }
      ]
    ]);
  });

});
