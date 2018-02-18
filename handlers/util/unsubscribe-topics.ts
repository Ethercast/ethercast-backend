import { crud } from './subscription-crud';
import SNS = require('aws-sdk/clients/sns');

const sns = new SNS();

export default async function unsubscribeTopics(subscriptionId: string): Promise<void> {
  console.log(`listing topics for subscriptionId: ${subscriptionId}`);

  const subscriptions = await crud.listSubscriptions(subscriptionId);

  console.log(`unsubscribing subscription Arns: `, subscriptions.map(({ subscriptionArn }) => subscriptionArn).join('; '));

  await Promise.all(
    subscriptions.map(
      async ({ subscriptionId, subscriptionArn }) => {
        // unsubscribe from the topic
        await sns.unsubscribe({
          SubscriptionArn: subscriptionArn
        }).promise();

        console.log('unsubscribed SubscriptionArn: ', subscriptionArn);

        // then remove it
        await crud.removeSubscription(subscriptionArn);
      }
    )
  );
}
