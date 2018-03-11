import 'source-map-support/register';
import createApiGatewayHandler from '../util/create-api-gateway-handler';
import SubscriptionCrud from '../util/subscription-crud';
import logger from '../util/logger';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import * as Lambda from 'aws-sdk/clients/lambda';
import * as SNS from 'aws-sdk/clients/sns';

const subscriptionUtil = new SnsSubscriptionUtil({ logger, sns: new SNS(), lambda: new Lambda() });
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger, subscriptionUtil });

export const handle = createApiGatewayHandler(
  async ({ user }) => {
    const list = await crud.list(user);

    return {
      statusCode: 200,
      body: list
    };
  }
);