// routes/conversations.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

// GET /api/conversations
// Returns conversations for logged-in user (last message included)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const convs = await Conversation.find({ members: userId })
      .sort({ lastAt: -1 })
      .populate({ path: 'members', select: 'name email role' })
      .lean();
    res.json({ ok: true, conversations: convs });
  } catch (err) {
    console.error('GET /api/conversations', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/conversations/:id/messages?page=1&limit=30
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const convId = req.params.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const skip = (page - 1) * limit;

    // authorize: make sure req.user is member of this conversation
    const conv = await Conversation.findById(convId).lean();
    if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    if (!conv.members.map(m => String(m)).includes(String(req.user._id))) {
      return res.status(403).json({ message: 'Not a conversation member' });
    }

    const messages = await Message.find({ conversationId: convId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // return chronological ascending (oldest first)
    res.json({ ok: true, messages: messages.reverse(), page, limit });
  } catch (err) {
    console.error('GET /api/conversations/:id/messages', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;