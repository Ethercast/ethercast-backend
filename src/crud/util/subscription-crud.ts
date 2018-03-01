import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import uuid = require('uuid');

const { SUBSCRIPTIONS_TABLE, WEBHOOKS_RECEIPTS_TABLE } = process.env;
const USER_INDEX = 'ByUser';
const SUBSCRIPTION_ID_INDEX = 'BySubscriptionId';

export enum SubscriptionStatus {
  active = 'active',
  pending = 'pending',
  deactivated = 'deactivated'
}

export enum FilterType {
  address = 'address',
  topic0 = 'topic0',
  topic1 = 'topic1',
  topic2 = 'topic2',
  topic3 = 'topic3'
}

export interface Subscription {
  id: string; // uuid v4
  timestamp: number;
  user: string;
  name: string; // reasonable max length
  webhookUrl: string;
  status: SubscriptionStatus;
  description?: string; // reasonable max length - longer
  filters: {
    [filterType in FilterType]: string | string[] | null
  };
  subscriptionArn: string;
}


export interface Receipt {
  id: string;
  subscriptionId: string;
  success: boolean;
  timestamp: number;
  webhookUrl: string;
}

type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

const client = new DocumentClient();

export default class SubscriptionCrud {
  async create(subscription: Omit<Subscription, 'id' | 'user' | 'status' | 'timestamp'>, user: string): Promise<Subscription> {
    console.log('creating subscription', subscription);

    const id = uuid.v4();

    await client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: {
        ...subscription,
        id,
        user,
        timestamp: (new Date()).getTime(),
        status: SubscriptionStatus.active
      }
    }).promise();

    return this.get(id);
  }

  async get(id: string, ConsistentRead: boolean = true): Promise<Subscription> {
    console.log('getting subscription with ID', id);

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
    console.log('DEACTIVATING subscription with ID', id);

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
    console.log(`listing webhook receipts for ${subscriptionId}`);

    const { Items } = await client.query({
      TableName: WEBHOOKS_RECEIPTS_TABLE,
      IndexName: SUBSCRIPTION_ID_INDEX,
      KeyConditionExpression: 'subscriptionId = :subscriptionId',
      ExpressionAttributeValues: {
        ':subscriptionId': subscriptionId
      },
      Limit: 20
    }).promise();

    return Items as Receipt[];
  }

  async list(user: string): Promise<Subscription[]> {
    console.log('listing subscriptions for user', user);

    const { Items } = await client.query({
      TableName: SUBSCRIPTIONS_TABLE,
      IndexName: USER_INDEX,
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

export const crud = new SubscriptionCrud();
