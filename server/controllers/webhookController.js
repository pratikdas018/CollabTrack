const Project = require('../models/Project');
const Commit = require('../models/Commit');
const Task = require('../models/Task');

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
      const newCommits = payload.commits.map(commit => ({
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

      // 3.5 Link Commits to Tasks (Look for #TASK-12 pattern)
      const io = req.app.get('io');
      
      for (const commit of newCommits) {
        const match = commit.message.match(/#TASK-(\d+)/i);
        if (match) {
          const readableId = parseInt(match[1]);
          const task = await Task.findOne({ project: project._id, readableId });
          
          if (task) {
            task.linkedCommits.push({
              message: commit.message,
              url: commit.url,
              committer: commit.committerName,
              timestamp: commit.timestamp
            });
            task.history.push({ action: `🔗 Commit linked: ${commit.message.substring(0, 30)}...` });
            await task.save();
            io.to(project._id.toString()).emit('task-updated', task);
          }
        }
      }

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