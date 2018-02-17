import { Subscription } from './subscription-crud';
import * as SNS from 'aws-sdk/clients/sns';

const sns = new SNS();

export function generateTopics(sub: Subscription): string[] {
  return [];
}

/**
 * Given a subscription, subscribe to all the relevant SNS topics
 * @param {Subscription} sub the dynamo subscription record
 * @returns {Promise<string[]>} resolves to array of subscription ARNs
 */
export default async function createSubscriptions(sub: Subscription): Promise<string[]> {
  const topics = generateTopics(sub);

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
