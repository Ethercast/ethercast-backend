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

const EXAMPLE_TX_SUCCEEDS_MULTI = {
  'blockHash': '0x92179d3b27453d6c02eb3a63c8d8d6af7dde50f6e4d74cc26586115850e2dd67',
  'blockNumber': '0x52dc8a',
  'from': '0x99fe5d6383289cdd56e54fc0baf7f67c957a8888',
  'gas': '0x1046a',
  'gasPrice': '0xf5de81400',
  'hash': '0x5864b1fc4afd20178f00fff868f2b1e0e48b583ddcd1eeaf070d8bd6cc9b2ab4',
  'input': '0xa9059cbb000000000000000000000000300987eddf133482c045cfd11a6aab204a315acb00000000000000000000000000000000000000000000000ad1de1f86e0370000',
  'nonce': '0x339c',
  'to': '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0',
  'transactionIndex': '0x4',
  'value': '0x0',
  'v': '0x26',
  'r': '0xe164ff2d9b099019f4ccf38d5c2abb2fd2c49d2ce526942af5c7a2a4e2569fdf',
  's': '0x20c917c68ba185dc4e5d6e6c6240b2e528c9b68082c9b2cd780a5403761f52b7',
  'ethercast': {
    'methodName': 'transfer',
    'parameters': {
      '0': '0x300987eDdF133482c045cFD11a6aAB204a315aCb',
      '1': '199590000000000000000',
      '__length__': 2,
      'dst': '0x300987eDdF133482c045cFD11a6aAB204a315aCb',
      'wad': '199590000000000000000'
    }
  },
  'removed': false
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

  it('fails with example log', () => {
    expect(
      subscriptionMatches(EXAMPLE_ACTIVE_LOG_SUB, JSON.stringify(LOG_EXAMPLE_FAILED))
    ).to.be.false;
  });

  it('succeeds with OR conditions', () => {
    expect(
      subscriptionMatches(
        {
          ...EXAMPLE_ACTIVE_TX_SUB,
          filters: {
            from: [ '0x99fe5d6383289cdd56e54fc0baf7f67c957a8888', '0x99fe5d6383289cdd56e54fc0baf7f67c957a8898' ],
            to: [ '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0', '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdbf' ]
          }
        },
        JSON.stringify(EXAMPLE_TX_SUCCEEDS_MULTI)
      )
    ).to.be.true;
  });

  it('fails with and conditions', () => {
    expect(
      subscriptionMatches(
        {
          ...EXAMPLE_ACTIVE_TX_SUB,
          filters: {
            from: [ '0x19fe5d6383289cdd56e54fc0baf7f67c957a8888', '0x99fe5d6383289cdd56e54fc0baf7f67c957a8898' ],
            to: [ '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0', '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdbf' ]
          }
        },
        JSON.stringify(EXAMPLE_TX_SUCCEEDS_MULTI)
      )
    ).to.be.false;
  })

});