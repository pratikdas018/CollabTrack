const Task = require('../models/Task');
const User = require('../models/User');

const TASK_REF_PATTERNS = [
  /#(\d+)\b/gi,
  /\btask[-_\s:#]*([0-9]+)\b/gi
];

const DONE_KEYWORDS_REGEX = /\b(fix(?:e[sd])?|close[sd]?|resolve[sd]?|complete[sd]?|done|finish(?:ed|es|ing)?|ship(?:ped|ping)?)\b/i;
const DOING_KEYWORDS_REGEX = /\b(wip|work(?:ing)?|progress(?:ing)?|start(?:ed|ing)?|in[-_\s]*progress|doing|implement(?:ed|ing)?)\b/i;
const TODO_KEYWORDS_REGEX = /\b(todo|to[-_\s]*do|backlog|queue(?:d)?|pending|reopen(?:ed)?)\b/i;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveStatusKeyword = (message = '') => {
  if (TODO_KEYWORDS_REGEX.test(message)) return 'todo';
  if (DONE_KEYWORDS_REGEX.test(message)) return 'done';
  if (DOING_KEYWORDS_REGEX.test(message)) return 'doing';
  return null;
};

const extractReadableTaskIds = (message = '') => {
  const ids = new Set();

  for (const pattern of TASK_REF_PATTERNS) {
    let match;
    while ((match = pattern.exec(message)) !== null) {
      const id = Number(match[1]);
      if (!Number.isNaN(id) && id > 0) {
        ids.add(id);
      }
    }
  }

  return [...ids];
};

const resolveStatusFromMessage = (message = '') => {
  const readableIds = extractReadableTaskIds(message);
  if (readableIds.length === 0) return null;

  // If a task reference exists but no explicit status keyword,
  // default to "doing" to reflect active work.
  return resolveStatusKeyword(message) || 'doing';
};

const applyCommitAutomationForProject = async ({ projectId, commits = [], io }) => {
  const roomId = projectId.toString();

  for (const commit of commits) {
    const commitMessage = typeof commit.message === 'string' ? commit.message : '';
    const readableIds = extractReadableTaskIds(commitMessage);

    let tasks = [];
    let targetStatus = null;
    let statusSource = 'commit message';

    if (readableIds.length > 0) {
      tasks = await Task.find({ project: projectId, readableId: { $in: readableIds } });
      targetStatus = resolveStatusFromMessage(commitMessage);
    } else {
      const committerKey = (commit.committerUsername || commit.committerName || commit.committer || '').trim();
      if (!committerKey) continue;

      let committerUser = await User.findOne({ username: committerKey }).select('_id username');
      if (!committerUser) {
        committerUser = await User.findOne({
          username: { $regex: `^${escapeRegex(committerKey)}$`, $options: 'i' }
        }).select('_id username');
      }
      if (!committerUser) continue;

      const openAssignedTasks = await Task.find({
        project: projectId,
        assignees: committerUser._id,
        status: { $ne: 'done' }
      }).sort({ readableId: 1 });

      // Avoid incorrect auto-moves when a user has multiple active tasks.
      if (openAssignedTasks.length !== 1) continue;

      tasks = openAssignedTasks;
      targetStatus = resolveStatusKeyword(commitMessage) || 'doing';
      statusSource = 'assigned member commit';
    }

    if (tasks.length === 0) continue;

    for (const task of tasks) {
      let hasChanges = false;

      if (commit.url && !task.linkedCommits.some((linked) => linked.url === commit.url)) {
        task.linkedCommits.push({
          message: commitMessage,
          url: commit.url,
          committerName: commit.committerName || commit.committerUsername || commit.committer || 'Unknown',
          committer: commit.committerName || commit.committerUsername || commit.committer || 'Unknown',
          timestamp: commit.timestamp
        });
        task.history.push({
          action: `Commit linked from push: ${commitMessage.substring(0, 60)}`
        });
        hasChanges = true;
      }

      if (targetStatus && task.status !== targetStatus) {
        // Avoid moving finished tasks back to doing from later commits.
        if (!(task.status === 'done' && targetStatus === 'doing')) {
          task.status = targetStatus;
          task.history.push({
            action: `Auto-moved to ${targetStatus} from ${statusSource}`
          });
          hasChanges = true;
        }
      }

      if (!hasChanges) continue;

      await task.save();
      await task.populate('assignees');
      await task.populate('history.user');
      await task.populate('comments.user');

      if (io) {
        io.to(roomId).emit('task-updated', task);
      }
    }
  }
};

module.exports = {
  extractReadableTaskIds,
  resolveStatusFromMessage,
  applyCommitAutomationForProject
};
