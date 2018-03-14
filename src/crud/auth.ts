import * as jwk from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import { TOKEN_ISSUER } from '../util/env';
import logger from '../util/logger';

const issuer = TOKEN_ISSUER;
const audience = 'https://api.ethercast.io';

// Generate policy to allow this user to invoke this API. Scope checking happens in the handler
const generatePolicy = (principalId: string, scopes: string[]) => {
  return {
    principalId,
    context: {
      user: principalId,
      scopes
    },
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

const getJwts = (function () {
  let cachedJwts: Promise<any>;

  return function (): Promise<any> {
    if (cachedJwts) {
      return cachedJwts;
    } else {
      return (
        cachedJwts = fetch(`${issuer}.well-known/jwks.json`)
          .then(
            response => {
              if (response.status === 200) {
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
    cb('Unauthorized');
  }

  // call when the user is authenticated
  function authorized(user: string, scopes: string[]) {
    cb(null, generatePolicy(user, scopes));
  }


  if (event.authorizationToken) {
    // Remove 'bearer ' from token:
    const token = event.authorizationToken.substring(7);

    try {
      // Make a request to the iss + .well-known/jwks.json URL:
      const response = await getJwts();

      if (response.status !== 200) {
        unauthorized();
      } else {
        const body = await response.json();

        const k = body.keys[ 0 ];
        const { kty, n, e } = k;

        const jwkArray = { kty, n, e };

        const pem = jwkToPem(jwkArray);

        // Verify the token:
        jwk.verify(
          token,
          pem,
          { issuer, audience },
          (err, decodedJwt) => {
            if (err) {
              logger.info({ err }, 'Unauthorized user');
              unauthorized();
            } else {
              const { sub, scopes } = decodedJwt as any;

              logger.info({ sub, scopes }, `Authorized user`);
              authorized(sub, scopes);
            }
          }
        );
      }
    } catch (err) {
      logger.error({ err }, 'failed to authorize user');
      unauthorized();
    }
  } else {
    logger.info('No authorizationToken found in the header.');
    unauthorized();
  }
};
