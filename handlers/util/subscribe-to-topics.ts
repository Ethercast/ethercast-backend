import {
  Condition,
  CONDITION_SORT_ORDER,
  Subscription,
  SubscriptionLogic
} from './subscription-crud';
import * as SNS from 'aws-sdk/clients/sns';
import * as shajs from 'sha.js';
import _ = require('underscore');

const sns = new SNS();

export function getConditionCombinations(andConditions: SubscriptionLogic): Array<Array<Condition>> {
  let opts: Array<Array<Condition>> = [];

  if (andConditions.length === 1) {
    return andConditions;
  }

  andConditions.forEach(
    (orConditions, andIndex) => {
      // remove this and condition from the array to create a new array
      const withoutIndex = andConditions.slice().splice(andIndex, 1);

      orConditions.forEach(
        (condition, orIndex) => {

          const options = getConditionCombinations(withoutIndex);
          opts = opts.concat(
            options.map(option => ([condition, ...option]))
          );
        }
      );
    }
  );

  return opts;
}

export function getSortedAndCombinations(conditionCombos: Array<Array<Condition>>): Array<Array<string>> {
  return getConditionCombinations(conditionCombos)
    .map(
      andedCondition =>
        _.chain(andedCondition)
          .sortBy(({ value }) => value)
          .sortBy(({ type }) => CONDITION_SORT_ORDER[type])
          .uniq(({ type, value }) => `${type}-${value}`)
          .map(({ value }) => value)
          .value()
    );
}

export function hash(fields: string[]): string {
  return shajs('sha256').update(fields.join()).digest('hex');
}

export function generateTopics(sub: Subscription): string[] {
  const orCombinations = getSortedAndCombinations(sub.logic);

  return _.chain(orCombinations)
    .map(arr => `sub-${hash(arr)}`)
    .uniq()
    .value();
}

/**
 * Given a subscription, subscribe to all the relevant SNS topics
 * @param {Subscription} sub the dynamo subscription record
 * @returns {Promise<string[]>} resolves to array of subscription ARNs
 */
export default async function createSubscriptions(sub: Subscription): Promise<string[]> {
  console.log(`generating topics for subscription`, sub);

  const topics = generateTopics(sub);

  console.log(`attempting to subscribe to ${topics.length} topics`);

  return Promise.all(
    topics.map(
      async (TopicArn) => {
        const result = await sns.subscribe(
          {
            Endpoint: `https://api.if-eth.com/handle-event?subscription_id=${sub.id}`,
            Protocol: 'https',
            TopicArn
          }
        ).promise();

        if (!result.SubscriptionArn) {
          throw new Error('failed to subscribe to topic');
        }

        return result.SubscriptionArn;
      }
    )
  );
}
