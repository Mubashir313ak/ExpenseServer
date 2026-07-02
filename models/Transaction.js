'use strict';

const { mongoose } = require('../db');

const { Schema } = mongoose;

const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  type: {
    type: String,
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either "income" or "expense"',
    },
    required: true,
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Common access pattern: a user's transactions ordered by date (e.g. per month).
transactionSchema.index({ userId: 1, date: -1 });

module.exports =
  mongoose.models.Transaction ||
  mongoose.model('Transaction', transactionSchema);
