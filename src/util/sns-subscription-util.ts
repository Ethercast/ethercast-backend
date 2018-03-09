import * as _ from 'underscore';
import { LogSubscriptionFilters, TransactionSubscriptionFilters } from './models';
import toFilterPolicy from './to-filter-policy';
import { SEND_WEBHOOK_LAMBDA_NAME } from './env';
import * as SNS from 'aws-sdk/clients/sns';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as Logger from 'bunyan';

export default class SnsSubscriptionUtil {
  private sns: SNS;
  private lambda: Lambda;
  private logger: Logger;

  constructor({ sns, lambda, logger }: { sns: SNS; lambda: Lambda; logger: Logger; }) {
    this.sns = sns;
    this.lambda = lambda;
    this.logger = logger;
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

    this.logger.info({ aliasName, AliasArn }, 'created alias for lambda');

    // We have to do this to allow our topic to call the alias we just created
    const { Statement } = await this.lambda.addPermission({
      StatementId: subscriptionId,
      FunctionName: SEND_WEBHOOK_LAMBDA_NAME,
      Qualifier: aliasName,
      Action: 'lambda:InvokeFunction',
      Principal: 'sns.amazonaws.com',
      SourceArn: topicArn
    }).promise();

    this.logger.info({ Statement, topicArn, AliasArn, aliasName }, `added permission to lambda`);

    return AliasArn;
  };

  async createSNSSubscription(notificationLambdaName: string, topicName: string, subscriptionId: string, filters: LogSubscriptionFilters | TransactionSubscriptionFilters): Promise<string> {
    const TopicArn = await this.getTopicArn(topicName);
    const Endpoint = await this.createLambdaAlias(TopicArn, notificationLambdaName, subscriptionId);

    this.logger.info({ Endpoint }, 'subscribing endpoint arn');

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
