'use strict';

const express = require('express');
const { query } = require('express-validator');

const { getSummary } = require('../controllers/summaryController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  [
    query('month')
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('Query param "month" must be in YYYY-MM format'),
    validate,
  ],
  getSummary
);

module.exports = router;
