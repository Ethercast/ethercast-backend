import { APIGatewayEvent, Callback, Context, Handler } from 'aws-lambda';
import logger from './logger';

export interface Response {
  statusCode: number;
  headers?: {
    [header: string]: string | string[];
  };
  body?: object | null;
}

export function simpleError(statusCode: number, message: string): Response {
  return {
    statusCode,
    body: {
      message
    }
  };
}

export const UNAUTHORIZED = simpleError(401, 'Unauthorized');
export const BAD_REQUEST = simpleError(400, 'The request format was bad.');

interface ValidatedAPIGatewayEvent extends APIGatewayEvent {
  pathParameters: { [name: string]: string };
  queryStringParameters: { [name: string]: string };
  user: string;
  body: object | null
}

interface WrappedHandler {
  (event: ValidatedAPIGatewayEvent, context: Context): Promise<Response>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*'
};

/**
 * This function takes care of the common functions that a handle checks and passes an easier-to-use event
 * to the child
 * @param {WrappedHandler} handler
 * @returns {Handler}
 */
export default function createApiGatewayHandler(handler: WrappedHandler): Handler {
  return async function (event: APIGatewayEvent, context: Context, callback?: Callback): Promise<void> {
    if (!callback) {
      throw new Error('invalid caller');
    }

    let response: Response;

    const { requestContext: { authorizer } } = event;
    if (authorizer && authorizer.user && typeof authorizer.user === 'string') {
      try {
        const parsedBody = typeof event.body === 'string' ?
          JSON.parse(event.body) :
          null;

        try {
          response = await handler(
            {
              ...event,
              pathParameters: event.pathParameters || {},
              queryStringParameters: event.queryStringParameters || {},
              user: authorizer.user,
              body: parsedBody
            },
            context
          );
        } catch (err) {
          logger.error({ err }, 'request failed');

          response = {
            statusCode: 500,
            body: {
              message: 'Failed to handle your request. Please try again.'
            }
          };
        }
      } catch (err) {
        logger.error({ err, body: event.body }, 'invalid request body');
        response = simpleError(400, 'Request body was not JSON!');
      }
    } else {
      response = UNAUTHORIZED;
    }

    callback(null, {
      ...response,
      headers: {
        ...CORS_HEADERS,
        ...response.headers
      },
      body: response.body ?
        JSON.stringify(response.body) :
        null
    });
  };
}
