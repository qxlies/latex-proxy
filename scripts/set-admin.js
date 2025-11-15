require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/src/models/User');

async function setAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const login = process.argv[2];
    
    if (!login) {
      console.error('Usage: node set-admin.js <login>');
      process.exit(1);
    }

    const user = await User.findOneAndUpdate(
      { login },
      { $set: { isAdmin: true } },
      { new: true }
    );

    if (!user) {
      console.error(`User with login "${login}" not found`);
      process.exit(1);
    }

    console.log(`User "${user.login}" is now an admin`);
    console.log(`ID: ${user._id}`);
    console.log(`isAdmin: ${user.isAdmin}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setAdmin();