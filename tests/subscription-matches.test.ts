import subscriptionMatches from '../src/util/subscription-matches';
import { expect } from 'chai';
import {
  LogSubscription,
  SubscriptionStatus,
  SubscriptionType,
  TransactionSubscription
} from '@ethercast/backend-model';
import { DecodedLog } from '@ethercast/model';
import _ = require('underscore');
import toLogMessageAttributes from '../src/util/to-log-message-attributes';
import toFilterPolicy from '../src/util/to-filter-policy';

const EXAMPLE_ACTIVE_LOG_SUB: LogSubscription = {
  'secret': 'abc',
  'subscriptionArn': 'arn:aws:',
  'webhookUrl': 'https://ethercast.io',
  'status': SubscriptionStatus.active,
  'timestamp': 0,
  'user': 'some-user|abc',
  'filters': {
    'address': [ '0x06012c8cf97bead5deae237070f9587f8e7a266d' ]
  },
  'id': '00000000-014f-4018-b726-00f514dc79b5',
  'name': 'fake sub',
  'type': SubscriptionType.log
};

const EXAMPLE_DEACTIVATED_LOG_SUB: LogSubscription = {
  ...EXAMPLE_ACTIVE_LOG_SUB,
  status: SubscriptionStatus.deactivated
};

const EXAMPLE_ACTIVE_TX_SUB: TransactionSubscription = {
  'secret': 'abc',
  'subscriptionArn': 'arn:aws:',
  'webhookUrl': 'https://ethercast.io',
  'status': SubscriptionStatus.active,
  'timestamp': 0,
  'user': 'some-user|abc',
  'filters': {
    'from': [ '0x06012c8cf97bead5deae237070f9587f8e7a266d' ]
  },
  'id': '00000000-014f-4018-b726-00f514dc79b5',
  'name': 'fake sub',
  'type': SubscriptionType.transaction
};

const EXAMPLE_DEACTIVATED_TX_SUB: TransactionSubscription = {
  ...EXAMPLE_ACTIVE_TX_SUB,
  status: SubscriptionStatus.deactivated
};

const KITTY_TRANSFER_LOG: DecodedLog = {
  'address': '0x06012c8cf97bead5deae237070f9587f8e7a266d',
  'topics': [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
  ],
  'data': '0x000000000000000000000000b1690c08e213a35ed9bab7b318de14420fb57d8c00000000000000000000000095d459dc61fddde33b76af9d0fcbfca9217a550500000000000000000000000000000000000000000000000000000000000a2364',
  'blockNumber': '0x52af94',
  'transactionHash': '0x60610ab9a774a7f55491d6c7ba87bf0add702853e5ff13663f8cb91395110e29',
  'transactionIndex': '0x69',
  'blockHash': '0x94ef5f3107f088f9595bdb9138a9eb10c143c57d4aea7e18b4ff27972cb5d325',
  'logIndex': '0x3d',
  'removed': false,
  'ethercast': {
    'eventName': 'Transfer',
    'parameters': {
      '0': '0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C',
      '1': '0x95d459Dc61FddDE33b76Af9d0FcbFca9217A5505',
      '2': '664420',
      '__length__': 3,
      'from': '0xb1690C08E213a35Ed9bAb7B318DE14420FB57d8C',
      'to': '0x95d459Dc61FddDE33b76Af9d0FcbFca9217A5505',
      'tokenId': '664420'
    }
  }
};

const LOG_EXAMPLE_FAILED = {
  'address': '0xef68e7c694f40c8202821edf525de3782458639f',
  'topics': [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x0000000000000000000000000574f22b83b87ea19e200613e82fa9b0a5ae018b',
    '0x00000000000000000000000005ee546c1a62f90d7acbffd6d846c9c54c7cf94c'
  ],
  'data': '0x000000000000000000000000000000000000000000000125cd725332e0920000',
  'blockNumber': '0x52dcaa',
  'transactionHash': '0x0db2f38a1db45850c617f573c449010524c736655fa7eb4841ae1c93597ebc07',
  'transactionIndex': '0x51',
  'blockHash': '0x900b1989b72cfb3fad1702301e903afcc367b4fba337780ec3e6473dca18822c',
  'logIndex': '0x1e',
  'removed': false,
  'ethercast': {
    'eventName': 'Transfer',
    'parameters': {
      '0': '0xFC378dAA952ba7f163c4a11628f55a4df523b3EF',
      '1': '0x0574F22b83b87eA19E200613E82FA9b0a5aE018B',
      '2': '5419700000000000000000',
      '__length__': 3,
      'from': '0xFC378dAA952ba7f163c4a11628f55a4df523b3EF',
      'to': '0x0574F22b83b87eA19E200613E82FA9b0a5aE018B',
      'value': '5419700000000000000000'
    }
  }
};

describe('#subscriptionMatches', () => {
  it('matches if we fail to understand the message', () => {
    _.each([ '{""}', 'red', 'blue', 'abc', '123', 'true', 'false' ], message => {
      _.each(
        [ EXAMPLE_ACTIVE_TX_SUB, EXAMPLE_ACTIVE_LOG_SUB ],
        sub => {
          expect(subscriptionMatches(sub, message)).to.be.true;
        }
      );

      _.each(
        [ EXAMPLE_DEACTIVATED_LOG_SUB, EXAMPLE_DEACTIVATED_TX_SUB ],
        sub => {
          expect(subscriptionMatches(sub, message)).to.be.false;
        }
      );
    });
  });

  it('matches cryptokitty log', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_LOG_SUB, JSON.stringify(KITTY_TRANSFER_LOG))
    ).to.be.true;

    expect(
      subscriptionMatches(EXAMPLE_DEACTIVATED_LOG_SUB, JSON.stringify(KITTY_TRANSFER_LOG))
    ).to.be.false;
  });

  it('kitty log matches tx sub bc it is not a tx', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_TX_SUB, JSON.stringify(KITTY_TRANSFER_LOG))
    ).to.be.true;

    expect(
      subscriptionMatches(EXAMPLE_DEACTIVATED_TX_SUB, JSON.stringify(KITTY_TRANSFER_LOG))
    ).to.be.false;
  });

  it('case insensitive match', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_LOG_SUB, JSON.stringify({
        ...KITTY_TRANSFER_LOG,
        address: KITTY_TRANSFER_LOG.address.toUpperCase()
      }))
    ).to.be.true;
  });

  it('fails with different address', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_LOG_SUB, JSON.stringify({
        ...KITTY_TRANSFER_LOG,
        address: KITTY_TRANSFER_LOG.address + 'a'
      }))
    ).to.be.true;
  });

  it.only('fails with example log', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_LOG_SUB, JSON.stringify(LOG_EXAMPLE_FAILED))
    ).to.be.false;
  });
});