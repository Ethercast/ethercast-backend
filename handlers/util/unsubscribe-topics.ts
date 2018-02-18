import { crud } from './subscription-crud';
import SNS = require('aws-sdk/clients/sns');

const sns = new SNS();

export default async function unsubscribeTopics(subscriptionId: string): Promise<void> {
  const subscriptions = await crud.listSubscriptions(subscriptionId);

  await Promise.all(
    subscriptions.map(
      async ({ subscriptionId, subscriptionArn }) => {
        // unsubscribe from the topic
        await sns.unsubscribe({
          SubscriptionArn: subscriptionArn
        }).promise();

        // then remove it
        await crud.removeSubscription(subscriptionArn);
      }
    )
  );
}
