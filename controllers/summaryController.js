'use strict';

const mongoose = require('mongoose');

const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { getMonthRange } = require('../utils/month');

/**
 * GET /api/summary?month=YYYY-MM
 * Returns totals (income, expense, net balance) plus a breakdown of expenses
 * by category for the given month. Computed with a single aggregation pipeline
 * so the work happens in the database rather than in Node — important for
 * users with large transaction histories.
 */
const getSummary = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const { start, end } = getMonthRange(month);

  const userId = new mongoose.Types.ObjectId(req.user.id);
  const match = { userId, date: { $gte: start, $lt: end } };

  const [totalsAgg, breakdownAgg] = await Promise.all([
    // Totals per type.
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    // Expense breakdown grouped by category, joined to category names.
    Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      {
        $group: {
          _id: '$categoryId',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          total: 1,
          count: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const row of totalsAgg) {
    if (row._id === 'income') totalIncome = row.total;
    if (row._id === 'expense') totalExpense = row.total;
  }

  res.json({
    month,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    expensesByCategory: breakdownAgg,
  });
});

module.exports = { getSummary };
