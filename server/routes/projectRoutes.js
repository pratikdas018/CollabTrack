const express = require('express');
const router = express.Router();
const { createProject, getProject, syncCommits, addTask, updateTaskStatus, addMember, updateMemberRole, deleteProject, assignTask, addComment, getMyTasks, nudgeMember, updateProject, leaveProject, removeMember } = require('../controllers/projectController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.post('/', ensureAuth, createProject);
router.get('/tasks/me', ensureAuth, getMyTasks); // Must be before /:id
router.get('/:id', getProject);
router.post('/:id/sync', ensureAuth, syncCommits);
router.post('/:id/tasks', ensureAuth, addTask);
router.put('/:id/tasks/:taskId', ensureAuth, updateTaskStatus);
router.put('/:id/tasks/:taskId/assign', ensureAuth, assignTask);
router.post('/:id/tasks/:taskId/comments', ensureAuth, addComment);
router.post('/:id/members', ensureAuth, addMember);
router.put('/:id/members/:userId', ensureAuth, updateMemberRole);
router.delete('/:id', ensureAuth, deleteProject);
router.post('/:id/leave', ensureAuth, leaveProject);
router.delete('/:id/members/:userId', ensureAuth, removeMember);

module.exports = router;