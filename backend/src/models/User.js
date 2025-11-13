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
  },
  // Global provider settings
  globalProviderType: {
    type: String,
    default: 'openrouter',
    enum: ['openrouter', 'aistudio', 'gorouter', 'free', 'custom'],
  },
  globalProviders: {
    type: Object,
    default: {
      openrouter: { apiKey: '', model: '' },
      aistudio: { apiKey: '', model: 'gemini-2.5-pro' },
      gorouter: { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' },
      free: { model: 'gemini-2.5-pro' },
      custom: { endpoint: '', apiKey: '', model: '' }
    }
  },
  // Global request parameters (temperature, max_tokens, etc.)
  globalRequestParams: {
    type: Object,
    default: {}
  },
  // Content filters (banned text patterns with optional replacement)
  contentFilters: {
    type: [{
      id: { type: String, required: true },
      pattern: { type: String, required: true },
      replacement: { type: String, default: null }, // null = block, string = replace
      caseSensitive: { type: Boolean, default: false },
      enabled: { type: Boolean, default: true },
      group: { type: String, default: null }, // null = "General" group
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  // Filter groups metadata (custom names)
  filterGroups: {
    type: [{
      id: { type: String, required: true }, // group identifier
      name: { type: String, required: true }, // display name
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  // Last request data for content filter preview
  lastRequestData: {
    type: Object,
    default: null
  },
  // AI Assistant chat history
  aiChats: {
    type: [{
      id: { type: String, required: true },
      profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
      title: { type: String, default: 'New Chat' },
      messages: [{
        id: { type: String, required: true },
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        suggestions: { type: Array, default: [] },
        timestamp: { type: Date, default: Date.now }
      }],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  // Last active chat ID per profile
  lastActiveChatId: {
    type: Map,
    of: String,
    default: new Map()
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