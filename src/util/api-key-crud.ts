import {
  API_KEYS_TABLE,
  TOKEN_AUDIENCE,
  TOKEN_SECRET,
} from './env';
import {
  CreateApiKeyRequest,
  ApiKey,
  ApiKeyStatus,
} from '@ethercast/backend-model';
import * as Logger from 'bunyan';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import uuid = require('uuid');

const SUBSCRIPTIONS_USER_INDEX = 'ByUser';
const SUBSCRIPTIONS_ARN_INDEX = 'BySubscriptionArn';
const WEBHOOK_RECEIPTS_SUBSCRIPTION_ID_INDEX = 'BySubscriptionId';

interface ApiKeyCrudConstructorOptions {
  client: DynamoDB.DocumentClient;
  logger: Logger;
}

const TOPIC_NAME_MAP = {
  [ SubscriptionType.log ]: LOG_NOTIFICATION_TOPIC_NAME,
  [ SubscriptionType.transaction ]: TX_NOTIFICATION_TOPIC_NAME
};

export default class ApiKeyCrud {
  private client: DynamoDB.DocumentClient;
  private logger: Logger;

  constructor({ client, logger }: ApiKeyCrudConstructorOptions) {
    this.client = client;
    this.logger = logger;
  }

  async create(validatedRequest: CreateApiKeyRequest, user: string): Promise<Subscription> {
    this.logger.info({ validatedRequest, user }, 'creating api key');

    const { name, scopes } = validatedRequest;
    const jit = uuid.v4();
    const aud = TOKEN_AUDIENCE;
    const iss = TOKEN_AUDIENCE;
    const tenant = user;
    const scopesList = scopes.join(' ');

    try {
      const token = jwt.sign({ jit, name, aud, iss, tenant, scopes: scopesList }, TOKEN_SECRET);
    } catch (err) {
      return Promise.reject(err);
    }

    await this.client.put({
      TableName: API_KEYS_TABLE,
      Item: { jit, name, user, token, scopes, status: ApiKeyStatus.active }
    }).promise();

    this.logger.info({ saved: apiKey }, 'api key created');

    return apiKey;
  }

  async get(id: string, user: string): Promise<ApiKey> {
    this.logger.info({ id, user }, 'getting api key');

    const { Item } = await this.client.get({
      TableName: API_KEYS_TABLE,
      Key: { id },
      ConsistentRead: true
    }).promise();

    if (Item && Item.user !== user) {
      return null;
    }

    return Item as ApiKey;
  }

  async deactivate(id: string): Promise<void> {
    this.logger.info({ id }, 'deactivating api key');

    await this.client.update({
      TableName: API_KEYSS_TABLE,
      Key: { id },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': ApiKeyStatus.deactivated
      }
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
