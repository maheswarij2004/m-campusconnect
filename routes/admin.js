// routes/admin.js  (updated)
const express = require('express');
const router = express.Router();
const checkAdmin = require('../middleware/checkadmin');
const Report = require('../models/report');
const User = require('../models/user');
const Message = require('../models/message');

// GET /api/admin/reports
router.get('/reports', checkAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 20;
    const reports = await Report.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    res.json({ ok: true, reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/reports/:id/action
router.post('/reports/:id/action', checkAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { actionType, note } = req.body;
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    let actionTaken = null;
    if (actionType === 'delete_message' && report.targetType === 'message') {
      await Message.findByIdAndUpdate(report.targetId, { isDeleted: true });
      actionTaken = 'message_deleted';
      // emit message_deleted to the convo (optional: use io)
    } else if (actionType === 'block_user' && report.targetType === 'user') {
      await User.findByIdAndUpdate(report.targetId, { isBlocked: true });
      actionTaken = 'user_blocked';
      // force disconnect:
      if (req.app && typeof req.app.locals.forceDisconnectUser === 'function') {
        req.app.locals.forceDisconnectUser(report.targetId).catch(err => console.error('forceDisconnectUser err', err));
      }
    } else if (actionType === 'warn') {
      actionTaken = 'warned';
    } else {
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

    // force disconnect immediately
    if (req.app && typeof req.app.locals.forceDisconnectUser === 'function') {
      req.app.locals.forceDisconnectUser(userId).catch(err => console.error('forceDisconnectUser err', err));
    }

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
    // optionally emit event to conversation room, handled by server's io
    res.json({ ok: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;