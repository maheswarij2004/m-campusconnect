// scripts/seedUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/campusconnect';
mongoose.connect(MONGO).then(() => console.log('Mongo connected for seeding'))
  .catch(err => { console.error(err); process.exit(1); });

async function seed() {
  try {
    await User.deleteMany({ email: /test\+/ });

    const users = [
      { name: 'Test User A', email: 'test+usera@example.com', password: 'passwordA', role: 'student' },
      { name: 'Test User B', email: 'test+userb@example.com', password: 'passwordB', role: 'student' }
    ];

    const created = [];
    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      const doc = await User.create({ name: u.name, email: u.email, password: hashed, role: u.role });
      const token = jwt.sign({ id: doc._id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
      created.push({ id: doc._id.toString(), name: u.name, email: u.email, token });
    }

    console.log('Seeded users (keep tokens secret):\n', created);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();