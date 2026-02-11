const express = require('express');
const router = express.Router();
const { createProject, getProjects, getInvitations, acceptInvitation, rejectInvitation, getProject, syncCommits, addTask, updateTaskStatus, addMember, updateMemberRole, deleteProject, assignTask, addComment, getMyTasks, nudgeMember, updateProject, leaveProject, removeMember, linkCommit } = require('../controllers/projectController');
const { ensureAuth } = require('../middleware/authMiddleware');

router.post('/', ensureAuth, createProject);
router.get('/', ensureAuth, getProjects);
router.get('/tasks/me', ensureAuth, getMyTasks); // Must be before /:id
router.get('/invitations/me', ensureAuth, getInvitations); // Must be before /:id
router.get('/:id', ensureAuth, getProject);
router.post('/:id/sync', ensureAuth, syncCommits);
router.post('/:id/tasks', ensureAuth, addTask);
router.put('/:id/tasks/:taskId', ensureAuth, updateTaskStatus);
router.put('/:id/tasks/:taskId/assign', ensureAuth, assignTask);
router.post('/:id/tasks/:taskId/comments', ensureAuth, addComment);
router.post('/:id/members', ensureAuth, addMember);
router.put('/:id/accept', ensureAuth, acceptInvitation);
router.put('/:id/reject', ensureAuth, rejectInvitation);
router.post('/:id/nudge', ensureAuth, nudgeMember);
router.put('/:id/members/:userId', ensureAuth, updateMemberRole);
router.put('/:id', ensureAuth, updateProject);
router.delete('/:id', ensureAuth, deleteProject);
// Add this route definition
router.post('/:id/tasks/:taskId/link-commit', ensureAuth, linkCommit);
router.post('/:id/leave', ensureAuth, leaveProject);
router.delete('/:id/members/:userId', ensureAuth, removeMember);

module.exports = router;