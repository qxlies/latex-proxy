const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true,
  },
  apiKey: {
    type: String,
    unique: true,
    required: true,
    default: () => `sk-` + uuidv4().replace(/-/g, ''),
  },
  login: {
    type: String,
    required: [true, 'Please provide login'],
    minlength: 3,
    maxlength: 50,
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
  },
  activeProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
  },
  isLoggingEnabled: {
   type: Boolean,
   default: false,
  },
  profileOrder: {
   type: [mongoose.Schema.Types.ObjectId],
   default: [],
  }
});

UserSchema.pre('save', async function () {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.createJWT = function () {
  return jwt.sign({ userId: this._id, login: this.login }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

module.exports = mongoose.model('User', UserSchema);