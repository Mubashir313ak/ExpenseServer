'use strict';

const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getMonthRange } = require('../utils/month');

/**
 * Ensures the given category belongs to the user and (optionally) matches the
 * transaction type. Returns the category document.
 */
async function assertOwnedCategory(userId, categoryId, type) {
  const category = await Category.findOne({ _id: categoryId, userId }).lean();
  if (!category) {
    throw ApiError.badRequest('Category not found or not owned by user');
  }
  if (type && category.type !== type) {
    throw ApiError.badRequest(
      `Category "${category.name}" is of type "${category.type}", not "${type}"`
    );
  }
  return category;
}

/**
 * GET /api/transactions
 * Lists the user's transactions. Supports filters:
 *   - month=YYYY-MM
 *   - category=<categoryId>
 *   - type=income|expense
 */
const listTransactions = asyncHandler(async (req, res) => {
  const { month, category, type } = req.query;

  const filter = { userId: req.user.id };

  if (month) {
    const { start, end } = getMonthRange(month);
    filter.date = { $gte: start, $lt: end };
  }

  if (category) {
    filter.categoryId = category;
  }

  if (type) {
    if (!['income', 'expense'].includes(type)) {
      throw ApiError.badRequest('Query param "type" must be income or expense');
    }
    filter.type = type;
  }

  const transactions = await Transaction.find(filter)
    .populate('categoryId', 'name type')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.json({ transactions });
});

/**
 * POST /api/transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { categoryId, amount, type, note, date } = req.body;

  await assertOwnedCategory(req.user.id, categoryId, type);

  const transaction = await Transaction.create({
    userId: req.user.id,
    categoryId,
    amount,
    type,
    note: note ? String(note).trim() : undefined,
    date: new Date(date),
  });

  res.status(201).json({ transaction });
});

/**
 * PUT /api/transactions/:id
 * Updates a transaction only if owned by the user.
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!transaction) {
    throw ApiError.notFound('Transaction not found');
  }

  const { categoryId, amount, type, note, date } = req.body;

  // Resolve the effective type/category to validate ownership + consistency.
  const nextType = type || transaction.type;
  const nextCategoryId = categoryId || transaction.categoryId;
  if (categoryId || type) {
    await assertOwnedCategory(req.user.id, nextCategoryId, nextType);
  }

  if (categoryId !== undefined) transaction.categoryId = categoryId;
  if (amount !== undefined) transaction.amount = amount;
  if (type !== undefined) transaction.type = type;
  if (note !== undefined) transaction.note = note ? String(note).trim() : '';
  if (date !== undefined) transaction.date = new Date(date);

  await transaction.save();

  res.json({ transaction });
});

/**
 * DELETE /api/transactions/:id
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const result = await Transaction.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!result) {
    throw ApiError.notFound('Transaction not found');
  }

  res.json({ success: true });
});

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
