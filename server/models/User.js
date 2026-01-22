const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  githubId: { type: String, required: true, unique: true },
  avatarUrl: String,
});

module.exports = mongoose.model('User', UserSchema);