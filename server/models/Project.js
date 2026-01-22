const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  repoUrl: { type: String },
  githubRepoId: { type: String }, // Crucial for identifying webhooks
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Owner', 'Member', 'Viewer'], default: 'Member' }
  }],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  deadline: { type: Date },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' }
});

module.exports = mongoose.model('Project', ProjectSchema);