'use strict';

const jwt = require('jsonwebtoken');
const { config } = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * Verifies a JWT from the `Authorization: Bearer <token>` header.
 *
 * On success it attaches a minimal identity to `req.user`:
 *   { id: <userId> }
 *
 * We deliberately keep this synchronous and DB-free: the token itself proves
 * identity, so we avoid a database round-trip on every protected request.
 * Controllers that need the full user document can load it by `req.user.id`.
 */
function authMiddleware(req, _res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(
      ApiError.unauthorized('Missing or malformed Authorization header')
    );
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(ApiError.unauthorized('Authentication token not provided'));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = { id: payload.sub };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token has expired'));
    }
    return next(ApiError.unauthorized('Invalid authentication token'));
  }
}

module.exports = authMiddleware;
