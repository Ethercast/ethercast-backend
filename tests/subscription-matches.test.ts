import subscriptionMatches from '../src/util/subscription-matches';
import { expect } from 'chai';
import {
  LogSubscription,
  SubscriptionStatus,
  SubscriptionType,
  TransactionSubscription
} from '@ethercast/backend-model';
import _ = require('underscore');

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
      subscriptionMatches(
        EXAMPLE_ACTIVE_LOG_SUB,
        JSON.stringify({
          // TODO: define a matching log here
        })
      )
    ).to.be.true;
  });
});