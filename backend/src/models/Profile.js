const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
});

const ProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  providerType: {
    type: String,
    default: 'openrouter',
    enum: ['openrouter', 'aistudio', 'gorouter', 'free', 'custom'],
  },
  providers: {
    type: Object,
    default: {
      openrouter: { apiKey: '', model: '' },
      aistudio: { apiKey: '', model: 'gemini-2.5-pro' },
      gorouter: { apiKey: '', model: '', thinkingEnabled: false, effort: 'medium', provider: 'Google' },
      free: { model: 'gemini-2.5-pro' },
      custom: { endpoint: '', apiKey: '', model: '' }
    }
  },
  // Legacy fields for backward compatibility
  proxyEndpoint: {
    type: String,
    default: 'https://openrouter.ai/api/v1',
  },
  proxyApiKey: {
    type: String,
    default: '',
  },
  model: {
    type: String,
    default: 'deepseek/deepseek-r1-0528:free',
  },
  extraParams: {
     type: String,
     default: '{}',
  },
  mergeConsecutiveRoles: {
     type: Boolean,
     default: true,
  },
  activeTabId: {
    type: String,
    default: null,
  },
  tabs: [TabSchema],
});

module.exports = mongoose.model('Profile', ProfileSchema);