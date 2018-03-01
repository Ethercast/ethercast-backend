import { APIGatewayEvent, Handler } from 'aws-lambda';
import { crud } from '../util/subscription-crud';
import createProxyHandler from '../util/create-handler';

export const handle = createProxyHandler(
  async (event) => {
    const { pathParameters } = event;
    if (!pathParameters) {
      throw new Error('missing path parameters');
    }

    const { requestContext: { authorizer: { user } } } = event as any;
    if (!user) {
      return {
        statusCode: 400
      };
    }

    const { id } = pathParameters;
    if (!id) {
      throw new Error('missing id in path');
    }

    const subscription = await crud.get(id);
    if (subscription.user !== user) {
      throw new Error(`invalid subscription id`);
    }

    return {
      statusCode: 200,
      body: subscription
    };
  }
);