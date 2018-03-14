import SubscriptionCrud from '../util/subscription-crud';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import logger from '../util/logger';
import * as SNS from 'aws-sdk/clients/sns';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as Lambda from 'aws-sdk/clients/lambda';
import SnsSubscriptionUtil from '../util/sns-subscription-util';
import { Scope } from '@ethercast/backend-model';

const sns = new SNS();
const subscriptionUtil = new SnsSubscriptionUtil({ logger, sns, lambda: new Lambda() });
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger, subscriptionUtil });

export const handle = createApiGatewayHandler(
  [ Scope.DEACTIVATE_SUBSCRIPTION ],
  async ({ pathParameters: { id }, user }) => {
    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return simpleError(
        404,
        'Subscription not found!'
      );
    }

    logger.info({ subscription }, 'unsubscribed subscription arn');

    const saved = await crud.deactivate(subscription);

    logger.info({ subscription }, `deactivated subscription`);

    return { statusCode: 200, body: saved };
  }
);