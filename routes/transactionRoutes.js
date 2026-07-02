'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listTransactions);

router.post(
  '/',
  [
    body('categoryId').isMongoId().withMessage('A valid categoryId is required'),
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a number greater than 0'),
    body('type')
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),
    body('date').isISO8601().withMessage('A valid date is required'),
    body('note').optional().isString().isLength({ max: 500 }),
    validate,
  ],
  createTransaction
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid transaction id'),
    body('categoryId').optional().isMongoId().withMessage('Invalid categoryId'),
    body('amount')
      .optional()
      .isFloat({ gt: 0 })
      .withMessage('Amount must be a number greater than 0'),
    body('type').optional().isIn(['income', 'expense']),
    body('date').optional().isISO8601().withMessage('A valid date is required'),
    body('note').optional({ nullable: true }).isString().isLength({ max: 500 }),
    validate,
  ],
  updateTransaction
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid transaction id'), validate],
  deleteTransaction
);

module.exports = router;
