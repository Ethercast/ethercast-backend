import 'source-map-support/register';
import SubscriptionCrud from '../util/subscription-crud';
import createApiGatewayHandler, { simpleError } from '../util/create-api-gateway-handler';
import logger from '../util/logger';
import { SNS, DynamoDB } from 'aws-sdk';

const sns = new SNS();
const crud = new SubscriptionCrud({ client: new DynamoDB.DocumentClient(), logger });

export const handle = createApiGatewayHandler(
  async ({ pathParameters: { id }, user }) => {
    const subscription = await crud.get(id);

    if (!subscription || subscription.user !== user) {
      return simpleError(
        404,
        'Subscription not found!'
      );
    }

    await sns.unsubscribe({ SubscriptionArn: subscription.subscriptionArn }).promise();

    logger.info({ subscription }, 'unsubscribed subscription arn');

    await crud.deactivate(subscription.id);

    logger.info({ subscription }, `deactivated subscription`);

    return { statusCode: 204 };
  }
);