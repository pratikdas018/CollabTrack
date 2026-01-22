const mongoose = require('mongoose');

const CommitSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  committerName: String,
  message: String,
  timestamp: Date,
  url: String,
  added: { type: Array, default: [] },   // Files added
  removed: { type: Array, default: [] }, // Files removed
  modified: { type: Array, default: [] } // Files modified
});

module.exports = mongoose.model('Commit', CommitSchema);