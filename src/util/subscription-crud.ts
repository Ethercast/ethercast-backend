import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { SUBSCRIPTIONS_TABLE, WEBHOOK_RECEIPTS_TABLE } from './env';
import logger from './logger';
import { JoiSubscription, Receipt, Subscription, SubscriptionStatus } from './models';
import uuid = require('uuid');

const SUBSCRIPTIONS_USER_INDEX = 'ByUser';
const WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX = 'BySubscriptionId';

type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

const client = new DocumentClient();

class SubscriptionCrud {
  async create(subscription: Omit<Subscription, 'id' | 'user' | 'status' | 'timestamp'>, user: string): Promise<Subscription> {
    logger.info({ subscription }, 'creating subscription');

    const id = uuid.v4();

    const { error, value: toSave } = JoiSubscription.validate({
      ...subscription,
      id,
      user,
      timestamp: (new Date()).getTime(),
      status: SubscriptionStatus.active
    });

    if (error) {
      logger.error({ validationError: error }, 'subscription failed pre-save validation');
      throw new Error('Validation error encountered while saving subscription');
    }

    await client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: toSave
    }).promise();

    logger.info({ saved: toSave }, 'subscription created');

    return this.get(id);
  }

  async get(id: string, ConsistentRead: boolean = true): Promise<Subscription> {
    logger.info({ id, ConsistentRead }, 'getting subscription');

    const { Item } = await client.get({
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

    await client.put({
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

    const { Items } = await client.query({
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

    const { Items } = await client.query({
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

export default new SubscriptionCrud();
