'use strict';

require('dotenv').config();

/**
 * Centralized, validated configuration.
 *
 * Reading env vars in one place makes it easy to fail fast with a clear
 * message when a required secret is missing, instead of getting an obscure
 * runtime error deep inside a request handler.
 */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    // Token lifetime. Kept short-ish for security; refresh flow can be added later.
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

/**
 * Validate required configuration. Throwing here means a misconfigured
 * deployment fails immediately at cold start rather than on the first request.
 */
function assertConfig() {
  const missing = [];
  if (!config.mongoUri) missing.push('MONGODB_URI');
  if (!config.jwt.secret) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'See .env.example for the full list.'
    );
  }
}

module.exports = { config, assertConfig };
