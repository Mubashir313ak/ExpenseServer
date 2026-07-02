'use strict';

const serverless = require('serverless-http');
const app = require('./app');

/**
 * AWS Lambda entry point. `serverless-http` adapts the Express app to the
 * Lambda event/response shape (works with API Gateway REST + HTTP APIs and
 * ALB). The handler is created once per container and reused across warm
 * invocations, matching the cached Mongo connection in db.js.
 */
const handler = serverless(app);

// Keep the Node.js event loop from waiting on open handles (e.g. the Mongo
// connection) so responses return as soon as the handler resolves.
module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return handler(event, context);
};
