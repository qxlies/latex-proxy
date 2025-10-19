const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
  statusText: {
    type: String,
    required: true,
  },
  responseBody: {
    type: Object,
    required: true,
  },
  usage: {
    prompt_tokens: { type: Number },
    completion_tokens: { type: Number },
    total_tokens: { type: Number },
  },
  placeholders: {
    bot_persona: { type: String },
    scenario: { type: String },
    user_persona: { type: String },
    summary: { type: String },
    lorebooks: { type: String },
    example_dialogs: { type: String },
    user: { type: String },
    char: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Log', LogSchema);