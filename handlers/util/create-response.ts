export default function createResponse(statusCode: number, body?: any) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
    },
    body: body ? JSON.stringify(body) : null
  };
}
