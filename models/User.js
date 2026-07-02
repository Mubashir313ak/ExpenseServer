'use strict';

const { mongoose } = require('../db');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      // Never expose the hash by default when documents are serialized.
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Strip sensitive/internal fields from JSON responses.
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Guard against model recompilation on Lambda warm starts / hot reload.
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
