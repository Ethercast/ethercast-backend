import {
  Condition,
  CONDITION_SORT_ORDER,
  Subscription,
  SubscriptionLogic
} from './subscription-crud';
import * as SNS from 'aws-sdk/clients/sns';
import * as shajs from 'sha.js';
import * as _ from 'underscore';
import * as qs from 'qs';

const sns = new SNS();

export function getCombinations(logic: SubscriptionLogic): Array<Array<Condition>> {
  if (logic.length === 0) {
    return [];
  }
  if (logic.length === 1) {
    // these are or-ed conditions - break them apart
    return logic[0].map(condition => [condition]);
  }

  let combinations: Array<Array<Condition>> = [];

  const andLogic = logic; // for clarity

  const orLogic = andLogic.splice(0, 1)[0];
  orLogic.forEach(condition => {
    const childLogic = andLogic.slice();
    getCombinations(childLogic)
      .forEach(childCombo => {
        combinations.push([condition, ...childCombo]);
      });
  });

  return combinations;
}

export function getSortedCombinations(logic: SubscriptionLogic): Array<Array<string>> {
  const combinations = getCombinations(logic);

  // sort combinations internally (by condition type)
  return _.map(combinations, combination =>
    _.chain(combination)
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
  const combinations = getSortedCombinations(logic);

  // hash combinations and remove duplicates
  return _.chain(combinations)
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
