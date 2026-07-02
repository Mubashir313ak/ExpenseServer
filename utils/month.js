'use strict';

const ApiError = require('./ApiError');

/**
 * Parses a "YYYY-MM" string into a UTC date range [start, end) covering that
 * whole calendar month. Using a half-open range with UTC boundaries keeps
 * month filtering correct regardless of server timezone.
 *
 * @param {string} month e.g. "2026-07"
 * @returns {{ start: Date, end: Date }}
 */
function getMonthRange(month) {
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    throw ApiError.badRequest('Query param "month" must be in YYYY-MM format');
  }

  const [year, mon] = month.split('-').map(Number);
  if (mon < 1 || mon > 12) {
    throw ApiError.badRequest('Query param "month" has an invalid month');
  }

  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0));
  return { start, end };
}

module.exports = { getMonthRange };
