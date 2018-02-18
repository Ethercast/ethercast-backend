import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import uuid = require('uuid');

const { SUBSCRIPTIONS_TABLE, SUBSCRIPTIONS_ARN_TABLE } = process.env;
const USER_INDEX = 'ByUser';

export enum ConditionType {
  address = 'address',
  topic0 = 'topic0',
  topic1 = 'topic1',
  topic2 = 'topic2',
  topic3 = 'topic3'
}

// how we sort the topics in the hashable arrays
export const CONDITION_SORT_ORDER: {[type in ConditionType]: number} = {
  address: 0,
  topic0: 1,
  topic1: 2,
  topic2: 3,
  topic3: 4
};

export interface Condition {
  type: ConditionType;
  value: string; // hex value of the type
}

// Conditions: the top-level arrays are AND-ed, nested arrays are OR-ed
export type SubscriptionLogic = Array<Array<Condition>>;

enum Status {
  active = 'active',
  deactivated = 'deactivated'
}

export interface Subscription {
  id: string; // uuid v4
  timestamp: number;
  user: string;
  name: string; // reasonable max length
  webhookUrl: string;
  status: Status;
  description?: string; // reasonable max length - longer

  logic: SubscriptionLogic;
}

type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

const client = new DocumentClient();

export default class SubscriptionCrud {
  async create(subscription: Omit<Subscription, 'id' | 'user' | 'status' | 'timestamp'>, user: string): Promise<Subscription> {
    console.log('creating subscription', subscription);

    const id = uuid.v4();

    const result = await client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: {
        ...subscription,
        id,
        user,
        timestamp: (new Date()).getTime(),
        status: Status.active
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
        status: Status.deactivated
      }
    }).promise();

    return this.get(id);
  }

  async addSubscriptionArn(subscriptionId: string, subscriptionArn: string): Promise<void> {
    console.log(`adding subscription arn to ${subscriptionId}: ${subscriptionArn}`);

    await client.put({
      TableName: SUBSCRIPTIONS_ARN_TABLE,
      Item: {
        subscriptionId,
        subscriptionArn
      }
    }).promise();
  }

  async delete(id: string): Promise<void> {
    console.log('DELETING subscription with ID', id);

    await client.delete({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: {
        id
      }
    }).promise();
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
