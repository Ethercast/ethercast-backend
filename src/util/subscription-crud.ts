import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { SUBSCRIPTIONS_TABLE, WEBHOOK_RECEIPTS_TABLE } from './env';
import logger from './logger';
import { JoiSubscription, Receipt, Subscription, SubscriptionStatus } from './models';
import uuid = require('uuid');

const SUBSCRIPTIONS_USER_INDEX = 'ByUser';
const WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX = 'BySubscriptionId';

export default class SubscriptionCrud {
  client: DocumentClient;

  constructor({ client }: { client: DocumentClient }) {
    this.client = client;
  }

  async save(subscription: Subscription, user: string): Promise<Subscription> {
    logger.info({ subscription }, 'saving subscription to dynamo');

    const { error, value: toSave } = JoiSubscription.validate({
      id: uuid.v4(),
      ...subscription,
      user,
      timestamp: (new Date()).getTime(),
      status: SubscriptionStatus.active
    });

    if (error) {
      logger.error({ validationError: error }, 'subscription failed pre-save validation');
      throw new Error('Validation error encountered while saving subscription');
    }

    await this.client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: toSave
    }).promise();

    logger.info({ saved: toSave }, 'subscription created');

    return this.get(toSave.id);
  }

  async get(id: string, ConsistentRead: boolean = true): Promise<Subscription> {
    logger.info({ id, ConsistentRead }, 'getting subscription');

    const { Item } = await this.client.get({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: {
        id
      },
      ConsistentRead
    }).promise();

    return Item as Subscription;
  }

  async deactivate(id: string): Promise<Subscription> {
    logger.info({ id }, 'DEACTIVATING subscription');

    const sub = await this.get(id);

    await this.client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: {
        ...sub,
        status: SubscriptionStatus.deactivated
      }
    }).promise();

    return this.get(id);
  }

  async listReceipts(subscriptionId: string): Promise<Receipt[]> {
    logger.info({ subscriptionId }, `listing webhook receipts`);

    const { Items } = await this.client.query({
      TableName: WEBHOOK_RECEIPTS_TABLE,
      IndexName: WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX,
      KeyConditionExpression: 'subscriptionId = :subscriptionId',
      ExpressionAttributeValues: {
        ':subscriptionId': subscriptionId
      },
      Limit: 20
    }).promise();

    return Items as Receipt[];
  }

  async list(user: string): Promise<Subscription[]> {
    logger.info({ user }, 'listing subscriptions');

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
}