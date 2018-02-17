import * as jwk from 'jsonwebtoken';
import * as jwkToPem from 'jwk-to-pem';
import * as request from 'request';

// For Auth0:       https://<project>.auth0.com/
// refer to:        http://bit.ly/2hoeRXk
const iss = 'https://if-eth.auth0.com/';

// Generate policy to allow this user on this API:
const generatePolicy = (principalId: any, effect: any, resource: any) => {
  const authResponse: any = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument: any = {
      Version: '2012-10-17',
      Statement: []
    };
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne: any = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};

// Reusable Authorizer function, set on `authorizer` field in serverless.yml
module.exports.authorize = (event: any, context: any, cb: any) => {
  console.log('Auth function invoked');

  if (event.authorizationToken) {
    // Remove 'bearer ' from token:
    const token = event.authorizationToken.substring(7);
    // Make a request to the iss + .well-known/jwks.json URL:
    request(
      { url: `${iss}.well-known/jwks.json`, json: true },
      (error: any, response: any, body: any) => {
        if (error || response.statusCode !== 200) {
          console.log('Request error:', error);
          cb('Unauthorized: internal server error');
        }

        // Based on the JSON of `jwks` create a Pem:
        const k = body.keys[0];
        const jwkArray = {
          kty: k.kty,
          n: k.n,
          e: k.e,
        };
        const pem = jwkToPem(jwkArray);

        // Verify the token:
        jwk.verify(token, pem, { issuer: iss }, (err: any, decoded: any) => {
          if (err) {
            console.log('Unauthorized user:', err.message);
            cb('Unauthorized: invalid token');
          } else {
            cb(null, generatePolicy(decoded.sub, 'Allow', event.methodArn));
          }
        });
      });
  } else {
    console.log('No authorizationToken found in the header.');
    cb('Unauthorized: must include authorization token in the header');
  }
};
