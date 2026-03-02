// middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization');
    if (!header) return res.status(401).json({ message: 'No authorization header' });
    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token - user not found' });
    if (user.isBlocked) return res.status(403).json({ message: 'User is blocked' });
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error', err.message);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = auth;