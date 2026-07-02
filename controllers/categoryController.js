'use strict';

const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/categories
 * Lists categories owned by the logged-in user (defaults first, then by name).
 */
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ userId: req.user.id })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  res.json({ categories });
});

/**
 * POST /api/categories
 * Creates a custom (non-default) category for the user.
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, type } = req.body;

  const category = await Category.create({
    userId: req.user.id,
    name: name.trim(),
    type,
    isDefault: false,
  });

  res.status(201).json({ category });
});

/**
 * DELETE /api/categories/:id
 * Deletes a category only if it belongs to the user and is not a default.
 * Blocks deletion when transactions still reference the category to avoid
 * orphaning data.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  if (category.isDefault) {
    throw ApiError.forbidden('Default categories cannot be deleted');
  }

  const inUse = await Transaction.exists({
    userId: req.user.id,
    categoryId: category._id,
  });
  if (inUse) {
    throw ApiError.conflict(
      'Category is used by existing transactions and cannot be deleted'
    );
  }

  await category.deleteOne();

  res.json({ success: true });
});

module.exports = { listCategories, createCategory, deleteCategory };
