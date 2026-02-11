const Project = require('../models/Project');
const Commit = require('../models/Commit');
const { applyCommitAutomationForProject } = require('../utils/taskAutomation');

// @desc    Handle GitHub Push Events
// @route   POST /api/webhooks/github-push
exports.handleGithubPush = async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'push') {
    try {
      const repoId = payload.repository.id.toString();

      // 1. Find the project linked to this repo
      const project = await Project.findOne({ githubRepoId: repoId });

      if (!project) {
        console.log(`Received push for unknown repo ID: ${repoId}`);
        return res.status(404).send('Project not found for this repo');
      }

      // 2. Process commits
      const newCommits = payload.commits.map((commit) => ({
        projectId: project._id,
        committerName: commit.author.username,
        message: commit.message,
        timestamp: commit.timestamp,
        url: commit.url,
        added: commit.added,
        removed: commit.removed,
        modified: commit.modified
      }));

      // 3. Save to DB
      await Commit.insertMany(newCommits);

      // 3.5 Link commits and auto-move tasks using commit message hints.
      const io = req.app.get('io');
      await applyCommitAutomationForProject({
        projectId: project._id,
        commits: newCommits,
        io
      });

      // 4. Real-time update via Socket.io
      io.to(project._id.toString()).emit('new-commit', newCommits);

      console.log(`Synced ${newCommits.length} commits for project: ${project.name}`);
      return res.status(200).send('Commits synced');
    } catch (error) {
      console.error('Webhook Error:', error);
      return res.status(500).send('Server Error');
    }
  }

  // Respond to ping events or others
  res.status(200).send('Event received');
};
