import serverlessExpress from '@codegenie/serverless-express';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
  Handler,
} from 'aws-lambda';
import app from './app';

/**
 * AWS Lambda handler wrapping the Express application using @codegenie/serverless-express.
 *
 * This adapter translates incoming AWS Lambda event payloads (API Gateway v1/v2,
 * Lambda Function URLs, Application Load Balancers) into standard Node.js HTTP
 * request/response streams consumed by Express, and packages Express responses back
 * into the required AWS Lambda format.
 *
 * Operational Characteristics:
 * - Serverless: Does NOT start a network socket or HTTP listener (`app.listen`).
 * - Event-driven: Only executes when an event arrives and finishes upon response.
 * - Non-blocking: Sets `callbackWaitsForEmptyEventLoop = false` to prevent Lambda
 *   from hanging on open timers or sockets after the HTTP response has been sent.
 * - Stateless design: Application state across multiple container instances must not
 *   rely on container memory (future Day 3 steps connect to DynamoDB).
 */
const serverlessExpressInstance = serverlessExpress({
  app,
  binarySettings: {
    contentTypes: [
      'image/*',
      'application/octet-stream',
      'application/pdf',
    ],
  },
});

const noopCallback: Callback = () => {};

export const handler: Handler<any, any> = async (
  event: any,
  context: Context,
  callback?: Callback
): Promise<any> => {
  // Prevent Lambda execution timeout if background Node timers remain active
  context.callbackWaitsForEmptyEventLoop = false;

  // Propagate Lambda Request ID to incoming Express headers for request logging
  if (event && context?.awsRequestId) {
    event.headers = event.headers || {};
    if (!event.headers['x-amzn-requestid']) {
      event.headers['x-amzn-requestid'] = context.awsRequestId;
    }
  }

  return serverlessExpressInstance(event, context, callback || noopCallback);
};

export default handler;
