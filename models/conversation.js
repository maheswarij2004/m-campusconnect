// models/Conversation.js
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String, default: '' },
  lastAt: { type: Date, default: null }
}, { timestamps: true });

ConversationSchema.index({ members: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);