const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
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
  proxyEndpoint: {
    type: String,
    default: 'https://openrouter.ai/api/v1',
  },
  proxyApiKey: {
    type: String,
    default: '',
  },
  activeTabId: {
    type: String,
    default: null,
  },
  tabs: [TabSchema],
});

module.exports = mongoose.model('Profile', ProfileSchema);