import * as _ from 'underscore';
import * as SNS from 'aws-sdk/clients/sns';
import * as Lambda from 'aws-sdk/clients/lambda';
import { SubscriptionFilters } from './models';
import toFilterPolicy from './to-filter-policy';

const lambda = new Lambda();
const sns = new SNS();

export const getTopicArn = _.memoize(
  async function (topicName: string): Promise<string> {
    const { TopicArn } = await sns.createTopic({
      Name: topicName
    }).promise();

    if (!TopicArn) {
      throw new Error(`failed to create topic: ${topicName}`);
    }

    return TopicArn;
  }
);

const createLambdaAlias = async function (notificationLambdaName: string, subscriptionId: string): Promise<string> {
  const { AliasArn } = await lambda.createAlias({
    FunctionName: notificationLambdaName,
    FunctionVersion: '$LATEST',
    Name: `subscription-${subscriptionId}`
  }).promise();

  if (!AliasArn) {
    throw new Error(`Failed to create function alias: ${subscriptionId}`);
  }

  return AliasArn;
};

export async function createSNSSubscription(notificationLambdaName: string, topicName: string, subscriptionId: string, filters: SubscriptionFilters): Promise<string> {
  const TopicArn = await getTopicArn(topicName);
  const Endpoint = await createLambdaAlias(notificationLambdaName, subscriptionId);

  const { SubscriptionArn } = await sns.subscribe({
    Protocol: 'lambda',
    TopicArn,
    Endpoint
  }).promise();

  if (!SubscriptionArn) {
    throw new Error('subscription ARN not received after subscribing!');
  }

  await sns.setSubscriptionAttributes({
    AttributeName: 'FilterPolicy',
    SubscriptionArn,
    AttributeValue: JSON.stringify(toFilterPolicy(filters))
  }).promise();

  return SubscriptionArn;
}
