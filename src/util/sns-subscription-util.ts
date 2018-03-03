import * as _ from 'underscore';
import { Lambda, SNS } from 'aws-sdk';
import { SubscriptionFilters } from './models';
import toFilterPolicy from './to-filter-policy';
import logger from './logger';
import { NOTIFICATION_LAMBDA_NAME } from './env';

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

  createLambdaAlias = async (topicArn: string, notificationLambdaName: string, subscriptionId: string) => {
    const aliasName = `subscription-${subscriptionId}`;
    const { AliasArn } = await this.lambda.createAlias({
      FunctionName: notificationLambdaName,
      FunctionVersion: '$LATEST',
      Name: aliasName
    }).promise();

    if (!AliasArn) {
      throw new Error(`Failed to create function alias: ${subscriptionId}`);
    }

    logger.info({ aliasName, AliasArn }, 'created alias for lambda');

    // We have to do this to allow our topic to call the alias we just created
    const { Statement } = await this.lambda.addPermission({
      StatementId: subscriptionId,
      FunctionName: NOTIFICATION_LAMBDA_NAME,
      Qualifier: aliasName,
      Action: 'lambda:InvokeFunction',
      Principal: 'sns.amazonaws.com',
      SourceArn: topicArn
    }).promise();

    logger.info({ Statement, topicArn, AliasArn, aliasName }, `added permission to lambda`);

    return AliasArn;
  };

  async createSNSSubscription(notificationLambdaName: string, topicName: string, subscriptionId: string, filters: SubscriptionFilters): Promise<string> {
    const TopicArn = await this.getTopicArn(topicName);
    const Endpoint = await this.createLambdaAlias(TopicArn, notificationLambdaName, subscriptionId);

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
