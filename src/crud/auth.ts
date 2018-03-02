import 'source-map-support/register';
import * as jwk from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';
import { TOKEN_ISSUER } from '../util/env';
import logger from '../util/logger';

// For Auth0:       https://<project>.auth0.com/
// refer to:        http://bit.ly/2hoeRXk
const issuer = TOKEN_ISSUER;

// Generate policy to allow this user on this API
// TODO: scope by the policies on the token
const generatePolicy = (principalId: string) => {
  return {
    principalId,
    context: {
      user: principalId
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

// Reusable Authorizer function, set on `authorizer` field in serverless.yml
module.exports.authorize = async (event: any, context: any, cb: any): Promise<void> => {
  logger.info('Auth function invoked');

  // call when the user is not authenticated
  function unauthorized() {
    cb('Unauthorized');
  }

  // call when the user is authenticated
  function authorized(user: string) {
    cb(null, generatePolicy(user));
  }

  if (event.authorizationToken) {
    // Remove 'bearer ' from token:
    const token = event.authorizationToken.substring(7);

    try {
      // Make a request to the iss + .well-known/jwks.json URL:
      const response = await fetch(`${issuer}.well-known/jwks.json`);

      if (response.status !== 200) {
        unauthorized();
      } else {
        const body = await response.json();

        const k = body.keys[0];
        const { kty, n, e } = k;

        const jwkArray = { kty, n, e };

        const pem = jwkToPem(jwkArray);

        // Verify the token:
        jwk.verify(token, pem, { issuer }, (err, decodedJwt) => {
          if (err) {
            logger.info({ err }, 'Unauthorized user');
            unauthorized();
          } else {
            // TODO: we need to use the OAuth2 authorizations here in the context, so users can be authorized
            // for specific actions in the API.
            const { sub } = decodedJwt as any;
            logger.info({ sub }, `Authorized user`);
            authorized(sub);
          }
        });
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
