import {
  LOG_NOTIFICATION_TOPIC_NAME,
  SEND_WEBHOOK_LAMBDA_NAME,
  SUBSCRIPTIONS_TABLE,
  TX_NOTIFICATION_TOPIC_NAME,
  WEBHOOK_RECEIPTS_TABLE
} from './env';
import {
  CreateLogSubscriptionRequest,
  CreateTransactionSubscriptionRequest,
  JoiSubscription,
  JoiWebhookReceiptResult,
  Subscription,
  SubscriptionStatus,
  SubscriptionType,
  WebhookReceipt,
  WebhookReceiptResult
} from '@ethercast/backend-model';
import * as Logger from 'bunyan';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import generateSecret from './generate-secret';
import SnsSubscriptionUtil from './sns-subscription-util';
import uuid = require('uuid');

const SUBSCRIPTIONS_USER_INDEX = 'ByUser';
const SUBSCRIPTIONS_ARN_INDEX = 'BySubscriptionArn';
const WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX = 'BySubscriptionId';

interface SubscriptionCrudConstructorOptions {
  client: DynamoDB.DocumentClient;
  logger: Logger;
  subscriptionUtil: SnsSubscriptionUtil;
}

const TOPIC_NAME_MAP = {
  [ SubscriptionType.log ]: LOG_NOTIFICATION_TOPIC_NAME,
  [ SubscriptionType.transaction ]: TX_NOTIFICATION_TOPIC_NAME
};

export default class SubscriptionCrud {
  private client: DynamoDB.DocumentClient;
  private subscriptionUtil: SnsSubscriptionUtil;
  private logger: Logger;

  constructor({ client, logger, subscriptionUtil }: SubscriptionCrudConstructorOptions) {
    this.client = client;
    this.logger = logger;
    this.subscriptionUtil = subscriptionUtil;
  }

  async create(validatedRequest: CreateTransactionSubscriptionRequest | CreateLogSubscriptionRequest, user: string): Promise<Subscription> {
    this.logger.info({ validatedRequest, user }, 'creating subscription');

    const subscriptionId = uuid.v4();

    // first subscribe to the sns topic
    let subscriptionArn: string;
    try {
      // a lambda arn may only be subscribed to a topic once, so publish a new version/arn
      subscriptionArn = await this.subscriptionUtil.createSNSSubscription(
        SEND_WEBHOOK_LAMBDA_NAME,
        TOPIC_NAME_MAP[ validatedRequest.type ],
        subscriptionId,
        validatedRequest.filters
      );

    } catch (err) {
      this.logger.error({ validatedRequest, user, err }, 'failed to create SNS subscription');

      throw err;
    }

    const { value: subscription, error } = JoiSubscription.validate({
      ...validatedRequest,
      id: subscriptionId,
      timestamp: Math.round(Date.now() / 1000),
      status: SubscriptionStatus.active,
      user,
      subscriptionArn,
      secret: await generateSecret(64)
    });

    if (error) {
      this.logger.error({ validationError: error, subscription }, 'subscription failed validation');
      throw new Error('Subscription failed validation');
    }

    await this.client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: subscription
    }).promise();

    this.logger.info({ saved: subscription }, 'subscription created');

    return subscription;
  }

  async get(id: string): Promise<Subscription> {
    this.logger.info({ id }, 'getting subscription');

    const { Item } = await this.client.get({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { id },
      ConsistentRead: true
    }).promise();

    const { value, error } = JoiSubscription.validate(Item);

    if (error) {
      this.logger.error({ validationError: error, id }, 'subscription failed validation on get');
      throw new Error(`Subscription did not match the expected schema.`);
    }

    return value as Subscription;
  }

  async getByArn(subscriptionArn: string): Promise<Subscription> {
    try {
      this.logger.info({ subscriptionArn }, 'querying subscription');

      const { Items } = await this.client.query({
        TableName: SUBSCRIPTIONS_TABLE,
        IndexName: SUBSCRIPTIONS_ARN_INDEX,
        KeyConditionExpression: 'subscriptionArn = :subscriptionArn',
        ExpressionAttributeValues: {
          ':subscriptionArn': subscriptionArn
        }
      }).promise();

      if (!Items || Items.length === 0) {
        this.logger.error({ Items, subscriptionArn }, 'no matching arns');
        throw new Error('no matching arns');
      } else if (Items.length > 1) {
        this.logger.error({ Items, subscriptionArn }, 'too many matching arns');
        throw new Error('too many matching arns');
      }

      const { value, error } = JoiSubscription.validate(Items[ 0 ]);

      if (error) {
        this.logger.error({
          validationError: error,
          subscriptionArn
        }, 'subscription failed validation on getByArn');
        throw new Error(`subscription did not match the expected schema`);
      }

      return value as Subscription;
    } catch (err) {
      this.logger.error({ err, subscriptionArn }, 'failed to get subscription by arn');
      throw err;
    }
  }

  async saveReceipt(subscription: Subscription, unvalidatedResult: WebhookReceiptResult): Promise<WebhookReceipt> {
    const { value: result, error } = JoiWebhookReceiptResult.validate(unvalidatedResult);

    if (error) {
      this.logger.error({ error }, 'webhook receipt failed validation');
      throw new Error('webhook receipt failed validation');
    }

    try {
      this.logger.debug({ subscription, result }, 'saving receipt');

      const timestamp = Math.round((new Date()).getTime() / 1000);

      const webhookReceipt: WebhookReceipt = {
        id: uuid.v4(),
        subscriptionId: subscription.id,
        url: subscription.webhookUrl,
        timestamp,
        // 7 days
        ttl: timestamp + 86400 * 7,
        result
      };

      await this.client.put({
        TableName: WEBHOOK_RECEIPTS_TABLE,
        Item: webhookReceipt
      }).promise();

      this.logger.debug({ subscription, webhookReceipt }, 'saved receipt');

      return webhookReceipt;
    } catch (err) {
      this.logger.error({ err, subscription, result }, `failed to save webhook receipt`);
      throw err;
    }
  }

  async deactivate(subscription: Subscription): Promise<Subscription> {
    this.logger.info({ subscription }, 'deactivating subscription');

    await this.subscriptionUtil.unsubscribe(subscription.subscriptionArn);

    await this.client.update({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { id: subscription.id },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': SubscriptionStatus.deactivated
      }
    }).promise();

    return this.get(subscription.id);
  }

  async list(user: string): Promise<Subscription[]> {
    this.logger.info({ user }, 'listing subscriptions');

    const { Items } = await this.client.query({
      TableName: SUBSCRIPTIONS_TABLE,
      IndexName: SUBSCRIPTIONS_USER_INDEX,
      KeyConditionExpression: '#user = :user',
      ExpressionAttributeValues: {
        ':user': user
      },
      ExpressionAttributeNames: {
        '#user': 'user'
      }
    }).promise();

    return Items as Subscription[];
  }

  async listReceipts(subscriptionId: string): Promise<WebhookReceipt[]> {
    this.logger.info({ subscriptionId }, `listing webhook receipts`);

    const { Items } = await this.client.query({
      TableName: WEBHOOK_RECEIPTS_TABLE,
      IndexName: WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX,
      KeyConditionExpression: 'subscriptionId = :subscriptionId',
      ExpressionAttributeValues: {
        ':subscriptionId': subscriptionId
      },
      Limit: 20
    }).promise();

    return Items as WebhookReceipt[];
  }
}