// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // hashed by auth module
  role: { type: String, default: 'student', enum: ['student', 'admin'] },
  isBlocked: { type: Boolean, default: false },
  blockedUntil: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);