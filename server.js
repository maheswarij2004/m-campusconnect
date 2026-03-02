// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const User = require('./models/user');
const Conversation = require('./models/conversation');
const Message = require('./models/message');
const Report = require('./models/report');

const authMiddleware = require('./middleware/auth');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());
app.use(cors());

// routes
app.use('/api/admin', authMiddleware, adminRoutes); // adminRoutes uses checkAdmin internally

app.get('/', (req, res) => res.send('CampusConnect Chat Module Server is running ✅'));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// connect mongo
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/campusconnect';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Socket auth middleware: expects token in handshake auth: { token: 'Bearer ...' } or token string
io.use(async (socket, next) => {
  try {
    const tokenRaw = socket.handshake.auth?.token;
    if (!tokenRaw) return next(new Error('auth error'));
    // token could be "Bearer <token>" or raw token
    const token = tokenRaw.startsWith('Bearer ') ? tokenRaw.replace('Bearer ', '') : tokenRaw;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return next(new Error('auth error'));
    if (user.isBlocked) return next(new Error('forbidden'));
    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket auth error', err.message);
    next(new Error('auth error'));
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id, 'userId:', socket.userId);

  // join a conversation room
  socket.on('join_conversation', (convId) => {
    if (!convId) return;
    socket.join(`conv_${convId}`);
  });

  // send_message: saves to DB, updates conversation, emits new_message
  // data: { conversationId, text, mediaUrl }
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, text, mediaUrl } = data;
      // basic validation
      if (!conversationId) return;

      // Optionally: Ensure conversation exists
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        // if not found, you might create one. For now, refuse.
        return socket.emit('error', { message: 'Conversation not found' });
      }

      const msg = await Message.create({
        conversationId,
        senderId: socket.userId,
        text: text || '',
        mediaUrl: mediaUrl || null,
        createdAt: new Date()
      });

      // Update conversation last
      conv.lastMessage = text ? text : (mediaUrl ? '📷 Media' : '');
      conv.lastAt = new Date();
      await conv.save();

      // Emit to room
      io.to(`conv_${conversationId}`).emit('new_message', msg);
    } catch (err) {
      console.error('send_message error', err);
      socket.emit('error', { message: 'send failed' });
    }
  });

  // typing indicator
  socket.on('typing', ({ conversationId, isTyping }) => {
    if (!conversationId) return;
    socket.to(`conv_${conversationId}`).emit('typing', { userId: socket.userId, isTyping });
  });

  // handle reporting from client
  // data: { targetType, targetId, reason }
  socket.on('report', async (data) => {
    try {
      const { targetType, targetId, reason } = data;
      if (!targetType || !targetId || !reason) return;
      const rpt = await Report.create({
        reporterId: socket.userId,
        targetType,
        targetId,
        reason,
        createdAt: new Date()
      });
      // notify admin clients optionally (emit to an admin room in future)
      // io.to('admins').emit('new_report', rpt);
      socket.emit('report_created', rpt);
    } catch (err) {
      console.error('report error', err);
      socket.emit('error', { message: 'report failed' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected', socket.id, reason);
  });
});

// helper to forcibly disconnect a user's sockets when blocked
const forceDisconnectUser = async (userId) => {
  for (const [id, socket] of io.of('/').sockets) {
    if (socket.userId === String(userId)) {
      socket.emit('admin:blocked', { reason: 'You have been blocked by admin' });
      socket.disconnect(true);
    }
  }
};

// expose function for admin route actions if you want to call it elsewhere
app.locals.forceDisconnectUser = forceDisconnectUser;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));