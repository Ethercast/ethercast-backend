import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import {
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
} from '../util/env';
import logger from '../util/logger';
import ApiKeyCrud from '../util/api-key-crud';

const issuer = TOKEN_ISSUER;
const audience = TOKEN_AUDIENCE;

const crud = new ApiKeyCrud({ client: new DynamoDB.DocumentClient(), logger });

// Generate policy to allow this user to invoke this API. Scope and user checking happens in the handler so that
// CORS headers are always sent
const generatePolicy = (result: { user: string; scope: string; } | null) => {

  return {
    ...(result ? {
      principalId: result.user,
      context: {
        user: result.user,
        scope: result.scope
      }
    } : null),
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: '*'
        }
      ]
    }
  };
};

const getJwks = (function () {
  let cachedJwts: Promise<any>;

  return function (): Promise<any> {
    if (cachedJwts) {
      return cachedJwts;
    } else {
      return (
        cachedJwts = fetch(`${issuer}.well-known/jwks.json`)
          .then(
            response => {
              if (response.status !== 200) {
                throw new Error('failed to get jwts');
              }

              return response.json();
            }
          )
      );
    }
  };
})();

// Reusable Authorizer function, set on `authorizer` field in serverless.yml
module.exports.authorize = async (event: any, context: any, cb: any): Promise<void> => {
  logger.debug('Auth function invoked');

  // call when the user is not authenticated
  function unauthorized() {
    cb(null, generatePolicy(null));
  }

  // call when the user is authenticated
  function authorized(user: string, scope: string) {
    cb(null, generatePolicy({ user, scope }));
  }

  function jwtCb(then: (decodedJwt: any) => void) {
    return (err: Error, decodedJwt: any) => {
      if (err) {
        logger.info({ err }, 'Unauthorized user');
        unauthorized();
      } else {
        then(decodedJwt);
      }
    };
  }

  async function authorizeApiKey(apiSey: string, apiSecret: string) {
    const key = await crud.get(apiKey);

    if (!key || key.secret !== apiSecret) {
      if (!key) {
        logger.info({ key }, 'API key not found');
      } else {
        logger.error({ key }, 'API key/secret mismatch');
      }
      unauthorized();
    } else {
      const { user, scopes } = key;
      logger.info({ user, scopes }, 'Authorized API Key');
      authorized(user, scopes.join(' '));
    }
  }

  async function authorizeJwt(bearerToken: string) {
    // Remove 'bearer ' from token:
    const token = authorization.substring(7);

    try {
      // Make a request to the iss + .well-known/jwks.json URL:
      const jwts = await getJwks();

      const k = jwts.keys[ 0 ];
      const { kty, n, e } = k;

      const jwkArray = { kty, n, e };

      const pem = jwkToPem(jwkArray);

      // Verify the token:
      jwt.verify(token, pem, { issuer, audience }, jwtCb(({ sub, scope }) => {
        logger.info({ sub, scope }, 'Authorized user');
        authorized(sub, scope);
      }));
    } catch (err) {
      logger.error({ err }, 'failed to authorize bearer token');
      unauthorized();
    }
  }

  event.headers = event.headers || {};
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  const apiSecret = event.headers['x-api-secret'] || event.headers['X-Api-Secret'];
  const authorization = event.headers.authorization || event.headers.Authorization;

  if (apiKey) {
    authorizeApiKey(apiKey, apiSecret);
  } else if (authorization) {
    authorizeJwt(authorization);
  } else {
    logger.info('Missing authorization.');
    unauthorized();
  }
};
