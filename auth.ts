import * as jwk from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import * as request from 'request';

// For Auth0:       https://<project>.auth0.com/
// refer to:        http://bit.ly/2hoeRXk
const issuer = 'https://if-eth.auth0.com/';

// Generate policy to allow this user on this API:
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
module.exports.authorize = (event: any, context: any, cb: any): void => {
  console.log('Auth function invoked');

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
    // Make a request to the iss + .well-known/jwks.json URL:

    request(
      { url: `${issuer}.well-known/jwks.json`, json: true },
      (error, response, body) => {
        if (error || response.statusCode !== 200) {
          console.log('Request error:', error);
          unauthorized();
        }

        // Based on the JSON of `jwks` create a Pem:
        const k = body.keys[0];
        const { kty, n, e } = k;

        const jwkArray = { kty, n, e };

        const pem = jwkToPem(jwkArray);

        // Verify the token:
        jwk.verify(token, pem, { issuer }, (err, decodedJwt) => {
          if (err) {
            console.log('Unauthorized user:', err);
            unauthorized();
          } else {
            const { sub } = decodedJwt as any;
            console.log(`Authorized user: ${sub}`);
            authorized(sub);
          }
        });
      });
  } else {
    console.log('No authorizationToken found in the header.');
    unauthorized();
  }
};
