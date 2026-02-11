const Task = require('../models/Task');

const TASK_REF_REGEX = /#(?:task-)?(\d+)\b/gi;
const DONE_KEYWORDS_REGEX = /\b(fix(?:e[sd])?|close[sd]?|resolve[sd]?|complete[sd]?|done)\b/i;
const DOING_KEYWORDS_REGEX = /\b(wip|work(?:ing)?|progress(?:ing)?|start(?:ed|ing)?|in\s+progress)\b/i;

const extractReadableTaskIds = (message = '') => {
  const ids = [];
  let match;

  while ((match = TASK_REF_REGEX.exec(message)) !== null) {
    ids.push(Number(match[1]));
  }

  return [...new Set(ids)];
};

const resolveStatusFromMessage = (message = '') => {
  const readableIds = extractReadableTaskIds(message);
  if (readableIds.length === 0) return null;

  if (DONE_KEYWORDS_REGEX.test(message)) return 'done';
  if (DOING_KEYWORDS_REGEX.test(message)) return 'doing';
  return null;
};

const applyCommitAutomationForProject = async ({ projectId, commits = [], io }) => {
  const roomId = projectId.toString();

  for (const commit of commits) {
    const readableIds = extractReadableTaskIds(commit.message);
    if (readableIds.length === 0) continue;

    const targetStatus = resolveStatusFromMessage(commit.message);
    const tasks = await Task.find({ project: projectId, readableId: { $in: readableIds } });

    for (const task of tasks) {
      let hasChanges = false;

      if (commit.url && !task.linkedCommits.some((linked) => linked.url === commit.url)) {
        task.linkedCommits.push({
          message: commit.message,
          url: commit.url,
          committer: commit.committerName || commit.committer || 'Unknown',
          timestamp: commit.timestamp
        });
        task.history.push({
          action: `Commit linked from push: ${commit.message.substring(0, 60)}`
        });
        hasChanges = true;
      }

      if (targetStatus && task.status !== targetStatus) {
        // Avoid moving finished tasks back to doing from later commits.
        if (!(task.status === 'done' && targetStatus === 'doing')) {
          task.status = targetStatus;
          task.history.push({
            action: `Auto-moved to ${targetStatus} from commit message`
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
