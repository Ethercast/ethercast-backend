import * as _ from 'underscore';
import * as SNS from 'aws-sdk/clients/sns';
import * as Lambda from 'aws-sdk/clients/lambda';
import { SubscriptionFilters } from './models';
import toFilterPolicy from './to-filter-policy';
import logger from './logger';

export default class SnsSubscriptionUtil {
  private sns: SNS;
  private lambda: Lambda;

  constructor({ sns, lambda }: { sns: SNS; lambda: Lambda; }) {
    this.sns = sns;
    this.lambda = lambda;
  }

  getTopicArn: (topicName: string) => Promise<string> =
    _.memoize(
      async (topicName: string) => {
        const { TopicArn } = await this.sns.createTopic({
          Name: topicName
        }).promise();

        if (!TopicArn) {
          throw new Error(`failed to create topic: ${topicName}`);
        }

        return TopicArn;
      }
    ) as any;

  createLambdaAlias = async (notificationLambdaName: string, subscriptionId: string) => {
    const { AliasArn } = await this.lambda.createAlias({
      FunctionName: notificationLambdaName,
      FunctionVersion: '$LATEST',
      Name: `subscription-${subscriptionId}`
    }).promise();

    if (!AliasArn) {
      throw new Error(`Failed to create function alias: ${subscriptionId}`);
    }

    return AliasArn;
  };

  async createSNSSubscription(notificationLambdaName: string, topicName: string, subscriptionId: string, filters: SubscriptionFilters): Promise<string> {
    const TopicArn = await this.getTopicArn(topicName);
    const Endpoint = await this.createLambdaAlias(notificationLambdaName, subscriptionId);

    logger.info({ Endpoint }, 'subscribing endpoint arn');

    const { SubscriptionArn } = await this.sns.subscribe({
      Protocol: 'lambda',
      TopicArn,
      Endpoint
    }).promise();

    if (!SubscriptionArn) {
      throw new Error('subscription ARN not received after subscribing!');
    }

    await this.sns.setSubscriptionAttributes({
      AttributeName: 'FilterPolicy',
      SubscriptionArn,
      AttributeValue: JSON.stringify(toFilterPolicy(filters))
    }).promise();

    return SubscriptionArn;
  }
}
