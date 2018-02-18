import {
  Condition, CONDITION_SORT_ORDER, Subscription,
  SubscriptionLogic
} from './subscription-crud';
import * as SNS from 'aws-sdk/clients/sns';
import * as shajs from 'sha.js';
import * as _ from 'underscore';
import * as qs from 'qs';

const sns = new SNS();

export function getConditionCombinations(andConditions: SubscriptionLogic): Array<Array<Condition>> {
  if (andConditions.length === 1) {
    return andConditions;
  }

  let allCombinations: Array<Array<Condition>> = [];

  andConditions.forEach(
    (orConditions, andIndex) => {
      // remove this and condition from the array to create a new array
      const withoutIndex = andConditions.slice().splice(andIndex, 1);

      orConditions.forEach(
        (condition, orIndex) => {

          const options = getConditionCombinations(withoutIndex);
          allCombinations = allCombinations.concat(
            options.map(option => ([condition, ...option]))
          );
        }
      );
    }
  );

  return allCombinations;
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

export function generateTopics(logic: SubscriptionLogic): string[] {
  const orCombinations = getSortedAndCombinations(logic);

  return _.chain(orCombinations)
    .map(arr => `sub-${hash(arr)}`)
    .uniq()
    .value();
}

export default async function createSubscriptions(subscription: Subscription): Promise<void> {
  console.log(`generating topics for subscription`, subscription.id);

  const topics = generateTopics(subscription.logic);

  console.log(`attempting to subscribe to ${topics.length} topics`, topics);

  await Promise.all(
    topics.map(
      async (topicName) => {
        const { TopicArn } = await sns.createTopic({
          Name: topicName
        }).promise();

        if (!TopicArn) {
          throw new Error('TopicArn failed to create with name: ' + topicName);
        }

        const result = await sns.subscribe(
          {
            Endpoint: `https://api.if-eth.com/handle-event?${qs.stringify({
              subscriptionId: subscription.id,
              webhookUrl: subscription.webhookUrl
            })}`,
            Protocol: 'https',
            TopicArn
          }
        ).promise();

        if (!result.SubscriptionArn) {
          throw new Error('failed to subscribe to topic: ' + topicName);
        }
      }
    )
  );
}
