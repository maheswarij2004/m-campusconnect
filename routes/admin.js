// routes/admin.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../middleware/checkAdmin');
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');

// GET /api/admin/reports - list reports (paginated)
router.get('/reports', checkAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const reports = await Report.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean();
    res.json({ ok: true, reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/reports/:id/action - take action on a report
// body: { actionType: 'delete_message'|'block_user'|'warn', note: 'optional note' }
router.post('/reports/:id/action', checkAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { actionType, note } = req.body;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // perform actions
    let actionTaken = null;
    if (actionType === 'delete_message' && report.targetType === 'message') {
      await Message.findByIdAndUpdate(report.targetId, { isDeleted: true });
      actionTaken = 'message_deleted';
    } else if (actionType === 'block_user' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, { isBlocked: true });
      actionTaken = 'user_blocked';
    } else if (actionType === 'warn') {
      actionTaken = 'warned';
    } else {
      // other actions can be added
      actionTaken = actionType;
    }

    report.status = 'resolved';
    report.actionTaken = `${actionTaken}${note ? `: ${note}` : ''}`;
    await report.save();

    res.json({ ok: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users/:id/block
router.post('/users/:id/block', checkAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(userId, { isBlocked: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users/:id/unblock
router.post('/users/:id/unblock', checkAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(userId, { isBlocked: false, blockedUntil: null }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/messages/:id
router.delete('/messages/:id', checkAdmin, async (req, res) => {
  try {
    const msgId = req.params.id;
    const message = await Message.findByIdAndUpdate(msgId, { isDeleted: true }, { new: true });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json({ ok: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;