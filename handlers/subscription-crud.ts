import * as AWS from 'aws-sdk';
import uuid = require('uuid');

const { SUBSCRIPTIONS_TABLE } = process.env;
const USER_INDEX = 'ByUser';

interface Condition {
  type: 'address' | 'topic0' | 'topic1' | 'topic2' | 'topic3';
  value: string; // hex value of the type
}

export interface Subscription {
  id: string; // uuid v4
  user: string;
  name: string; // reasonable max length
  description?: string; // reasonable max length - longer

  // Conditions in the top-level array are AND-ed, conditions in nested arrays are OR-ed
  logic: Array<Array<Condition>>;
}

type Diff<T extends string, U extends string> = ({[P in T]: P } & {[P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;

const client = new AWS.DynamoDB.DocumentClient();

export default class SubscriptionCrud {
  async create(subscription: Omit<Subscription, 'id' | 'user'>, user: string): Promise<Subscription> {
    const id = uuid.v4();

    const result = await client.put({
      TableName: SUBSCRIPTIONS_TABLE,
      Item: {
        ...subscription,
        id,
        user
      }
    }).promise();

    return this.get(id);
  }

  async get(id: string, ConsistentRead: boolean = true): Promise<Subscription> {
    const { Item } = await client.get({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: {
        id
      },
      ConsistentRead
    }).promise();

    return Item as Subscription;
  }

  async delete(id: string): Promise<void> {
    await client.delete({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: {
        id
      }
    }).promise();
  }

  async list(user: string): Promise<Subscription[]> {
    const { Items } = await client.query({
      TableName: SUBSCRIPTIONS_TABLE,
      IndexName: USER_INDEX,
      KeyConditionExpression: 'user = :user',
      ExpressionAttributeValues: {
        ':user': user
      }
    }).promise();

    return Items as Subscription[];
  }
}

export const crud = new SubscriptionCrud();
