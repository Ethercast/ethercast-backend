import {
  API_KEYS_TABLE,
} from './env';
import {
  CreateApiKeyRequest,
  ApiKey,
} from '@ethercast/backend-model';
import generateSecret from './generate-secret';
import * as Logger from 'bunyan';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import uuid = require('uuid');

const API_KEYS_USER_INDEX = 'ByUser';

interface ApiKeyCrudConstructorOptions {
  client: DynamoDB.DocumentClient;
  logger: Logger;
}

export default class ApiKeyCrud {
  private client: DynamoDB.DocumentClient;
  private logger: Logger;

  constructor({ client, logger }: ApiKeyCrudConstructorOptions) {
    this.client = client;
    this.logger = logger;
  }

  async create(validatedRequest: CreateApiKeyRequest, user: string): Promise<ApiKey> {
    this.logger.info({ validatedRequest, user }, 'creating api key');

    const { name, scopes } = validatedRequest;
    const id = uuid.v4();
    const secret = await generateSecret(64);

    const apiKey: ApiKey = { id, secret, name, scopes, user };

    await this.client.put({
      TableName: API_KEYS_TABLE,
      Item: apiKey
    }).promise();

    this.logger.info({ saved: apiKey }, 'api key created');

    return apiKey;
  }

  async get(id: string): Promise<ApiKey|null> {
    this.logger.info({ id }, 'getting api key');

    const { Item } = await this.client.get({
      TableName: API_KEYS_TABLE,
      Key: { id },
      ConsistentRead: true
    }).promise();

    return Item as ApiKey;
  }

  async delete(id: string): Promise<void> {
    this.logger.info({ id }, 'deleting api key');

    await this.client.delete({
      TableName: API_KEYS_TABLE,
      Key: { id }
    }).promise();
  }

  async list(user: string): Promise<ApiKey[]> {
    this.logger.info({ user }, 'listing api keys');

    const { Items } = await this.client.query({
      TableName: API_KEYS_TABLE,
      IndexName: API_KEYS_USER_INDEX,
      KeyConditionExpression: '#user = :user',
      ExpressionAttributeValues: {
        ':user': user
      },
      ExpressionAttributeNames: {
        '#user': 'user'
      }
    }).promise();

    return Items as ApiKey[];
  }
}
