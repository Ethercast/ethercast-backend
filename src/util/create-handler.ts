import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import logger from './logger';

export interface Response {
  statusCode: number;
  headers?: {
    [header: string]: string | string[];
  };
  body?: object | null;
}

export function errorResponse(statusCode: number, message: string): Response {
  return {
    statusCode,
    body: {
      message
    }
  };
}

export const UNAUTHORIZED = errorResponse(401, 'Unauthorized');
export const BAD_REQUEST = errorResponse(400, 'The request format was bad.');

interface WrappedHandler {
  (event: APIGatewayEvent, context: Context): Promise<Response>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*'
};

export default function createProxyHandler(handler: WrappedHandler): Handler {
  return async function (event: APIGatewayEvent, context: Context, callback?: Callback): Promise<void> {
    if (!callback) {
      throw new Error('invalid caller');
    }

    let response: Response;

    try {
      response = await handler(event, context);
    } catch (err) {
      logger.error({ err }, 'request failed');

      response = {
        statusCode: 500,
        body: {
          message: 'Internal server error!'
        }
      };
    }

    callback(null, {
      ...response,
      headers: {
        ...CORS_HEADERS,
        ...response.headers
      },
      body: response.body ? JSON.stringify(response.body) : null
    });
  };
}
