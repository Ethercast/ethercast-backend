import createApiGatewayHandler, { BAD_REQUEST } from '../util/create-api-gateway-handler';
import { SUBSCRIPTION_NOT_FOUND } from './get-sub';
import SubscriptionCrud from '../util/subscription-crud';
import logger from '../util/logger';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SNS from 'aws-sdk/clients/sns';
import SnsSubscriptionUtil from '../util/sns-subscription-util';

const subscriptionUtil = new SnsSubscriptionUtil({ logger, sns: new SNS(), lambda: new Lambda() });
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger, subscriptionUtil });

export const handle = createApiGatewayHandler(
  async ({ pathParameters: { id }, user }) => {
    if (!id) {
      return BAD_REQUEST;
    }

    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return SUBSCRIPTION_NOT_FOUND;
    }

    const receipts = await crud.listReceipts(subscription.id);

    return {
      statusCode: 200,
      body: receipts
    };
  }
);