'use strict';

const { mongoose } = require('../db');

const { Schema } = mongoose;

const categorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: 60,
  },
  type: {
    type: String,
    enum: {
      values: ['income', 'expense'],
      message: 'Type must be either "income" or "expense"',
    },
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

// A user should not have two categories with the same name + type.
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports =
  mongoose.models.Category || mongoose.model('Category', categorySchema);
