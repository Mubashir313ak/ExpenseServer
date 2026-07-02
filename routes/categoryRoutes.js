'use strict';

const express = require('express');
const { body, param } = require('express-validator');

const {
  listCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

const router = express.Router();

// Every category route requires authentication.
router.use(authMiddleware);

router.get('/', listCategories);

router.post(
  '/',
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('type')
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),
    validate,
  ],
  createCategory
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid category id'), validate],
  deleteCategory
);

module.exports = router;
