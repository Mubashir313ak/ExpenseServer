'use strict';

const express = require('express');
const { body } = require('express-validator');

const { signup, login, me } = require('../controllers/authController');
const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/signup',
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isString()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    validate,
  ],
  signup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
    validate,
  ],
  login
);

router.get('/me', authMiddleware, me);

module.exports = router;
