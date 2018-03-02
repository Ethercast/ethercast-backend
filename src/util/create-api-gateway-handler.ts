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

export const UNAUTHENTICATED = simpleError(401, 'Unauthorized');
export const BAD_REQUEST = simpleError(400, 'The request format was bad.');

type ValidatedAPIGatewayEvent = APIGatewayEvent & {
  pathParameters: { [name: string]: string };
  queryStringParameters: { [name: string]: string };
  user: string;
  parsedBody: object | null
}

interface WrappedHandler {
  (event: ValidatedAPIGatewayEvent, context: Context): Promise<Response>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*'
};

function processResponse(response: Response) {
  return {
    ...response,
    headers: {
      ...CORS_HEADERS,
      ...response.headers
    },
    body: response.body ?
      JSON.stringify(response.body) :
      null
  };
}

/**
 * This function takes care of the common functions that a handle checks and passes an easier-to-use event
 * to the child
 * @param {WrappedHandler} handler
 * @returns {Handler}
 */
export default function createApiGatewayHandler(handler: WrappedHandler): Handler {
  return async function apiGatewayRequestHandler(event: APIGatewayEvent, context: Context, callback?: Callback): Promise<void> {
    function respond(response: Response) {
      if (!callback) {
        throw new Error('missing callback');
      }
      callback(null, processResponse(response));
    }

    let response: Response;

    const { requestContext: { authorizer } } = event;
    if (!authorizer || !authorizer.user) {
      logger.error({ authorizer }, 'Unauthenticated request');
      respond(UNAUTHENTICATED);
      return;
    }

    const { user } = authorizer;

    if (typeof user !== 'string') {
      logger.error({ authorizer }, 'Missing user on authorizer');
      respond(UNAUTHENTICATED);
      return;
    }

    let parsedBody: object | null;
    try {
      parsedBody = typeof event.body === 'string' ?
        JSON.parse(event.body) :
        null;
    } catch (err) {
      logger.error({ err, body: event.body }, 'invalid request body');
      respond(simpleError(400, 'Request body was not JSON!'));
      return;
    }

    try {
      respond(
        await handler(
          {
            ...event,
            pathParameters: event.pathParameters || {},
            queryStringParameters: event.queryStringParameters || {},
            user, parsedBody
          },
          context
        )
      );
    } catch (err) {
      logger.error({ err }, 'request failed');

      respond(simpleError(500, 'Failed to handle your request. Please try again.'));
    }
  };
}
