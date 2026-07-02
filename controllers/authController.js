'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Category = require('../models/Category');
const { config } = require('../config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;

// Categories every new user starts with. "Salary" is income, the rest expense.
const DEFAULT_CATEGORIES = [
  { name: 'Food', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Salary', type: 'income' },
  { name: 'Other', type: 'expense' },
];

function signToken(userId) {
  return jwt.sign({}, config.jwt.secret, {
    subject: String(userId),
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * POST /api/auth/signup
 * Creates a user, hashes the password, seeds default categories, returns a JWT.
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail }).lean();
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  // Seed default categories. ordered:false so one duplicate doesn't abort all.
  await Category.insertMany(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user._id, isDefault: true })),
    { ordered: false }
  );

  const token = signToken(user._id);

  res.status(201).json({
    token,
    user: user.toJSON(),
  });
});

/**
 * POST /api/auth/login
 * Validates credentials and returns a JWT.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // passwordHash has select:false, so explicitly request it here.
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+passwordHash'
  );

  // Constant-ish response to avoid leaking which part failed.
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken(user._id);

  res.json({
    token,
    user: user.toJSON(),
  });
});

/**
 * GET /api/auth/me  (protected)
 * Returns the currently authenticated user.
 */
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  res.json({ user: user.toJSON() });
});

module.exports = { signup, login, me };
