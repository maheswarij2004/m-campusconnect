// scripts/seedConversation.js
require('dotenv').config();
const mongoose = require('mongoose');
const Conversation = require('../models/conversation');
const User = require('../models/user');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/campusconnect';
mongoose.connect(MONGO).then(() => console.log('Mongo connected for seeding conv'))
  .catch(err => { console.error(err); process.exit(1); });

async function seedConv() {
  try {
    const userA = await User.findOne({ email: 'test+usera@example.com' });
    const userB = await User.findOne({ email: 'test+userb@example.com' });
    if (!userA || !userB) {
      console.error('Test users not found. Run seedUsers.js first.');
      return process.exit(1);
    }
    let conv = await Conversation.findOne({ members: { $all: [userA._id, userB._id] } });
    if (!conv) {
      conv = await Conversation.create({ members: [userA._id, userB._id], lastMessage: '', lastAt: new Date() });
    }
    console.log('Conversation id:', conv._id.toString());
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seedConv();