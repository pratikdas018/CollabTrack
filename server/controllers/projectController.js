const Project = require('../models/Project');
const Commit = require('../models/Commit');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a new project
// @route   POST /api/projects
exports.createProject = async (req, res) => {
  try {
    const { name, repoUrl, githubRepoId, deadline } = req.body;
    
    const project = new Project({
      name,
      repoUrl,
      githubRepoId, // User must provide this or fetch it via GitHub API
      deadline,
      members: req.user ? [{ user: req.user._id, role: 'Owner', status: 'Accepted' }] : []
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Get all projects for current user
// @route   GET /api/projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ 
      members: { $elemMatch: { user: req.user._id, status: 'Accepted' } } 
    })
      .populate('members.user', 'username name avatarUrl')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all pending invitations for current user
// @route   GET /api/projects/invitations/me
exports.getInvitations = async (req, res) => {
  try {
    const invitations = await Project.find({ 
      members: { $elemMatch: { user: req.user._id, status: 'Pending' } } 
    })
    .populate('members.user', 'username name avatarUrl')
    .sort({ createdAt: -1 });
    res.json(invitations);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Add Member to Project
// @route   POST /api/projects/:id/members
exports.addMember = async (req, res) => {
  try {
    const { username } = req.body;
    const project = await Project.findById(req.params.id);
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ msg: 'User not found. They must login to the app first.' });
    }

    // Check if already member
    if (project.members.some(m => m.user.toString() === user._id.toString())) {
      return res.status(400).json({ msg: 'User already a member' });
    }

    project.members.push({ user: user._id, role: 'Member', status: 'Pending' });
    await project.save();
    
    // Create Notification for the invited user
    const notification = new Notification({
      recipient: user._id,
      sender: req.user._id,
      type: 'project_invitation',
      message: `${req.user.username} invited you to join project: ${project.name}`,
      project: project._id
    });
    await notification.save();

    // Real-time notification for the invited user
    const io = req.app.get('io');
    io.to(user._id.toString()).emit('notification', notification);

    // Notify existing members in the project room to update their UI
    io.to(project._id.toString()).emit('member-invited', { user, role: 'Member', status: 'Pending' });

    const updatedProject = await Project.findById(req.params.id).populate('members.user');
    res.json(updatedProject.members);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Accept Invitation
// @route   PUT /api/projects/:id/accept
exports.acceptInvitation = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.status !== 'Pending') {
      return res.status(400).json({ msg: 'No pending invitation found' });
    }

    member.status = 'Accepted';
    await project.save();

    const io = req.app.get('io');
    io.to(project._id.toString()).emit('member-added', { user: req.user, role: member.role });

    res.json({ msg: 'Invitation accepted', project });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Reject Invitation
// @route   PUT /api/projects/:id/reject
exports.rejectInvitation = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    project.members = project.members.filter(m => m.user.toString() !== req.user._id.toString());
    await project.save();

    res.json({ msg: 'Invitation rejected' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Update Member Role
// @route   PUT /api/projects/:id/members/:userId
exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const project = await Project.findById(req.params.id);
    
    const memberIndex = project.members.findIndex(m => m.user.toString() === req.params.userId);
    if (memberIndex > -1) {
      project.members[memberIndex].role = role;
      await project.save();
    }
    
    const updatedProject = await Project.findById(req.params.id).populate('members.user');
    res.json(updatedProject.members);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Get project details and commits
// @route   GET /api/projects/:id
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user')
      .populate({ path: 'tasks', populate: { path: 'assignees' } })
      .populate({ path: 'tasks', populate: { path: 'history.user' } })
      .populate({ path: 'tasks', populate: { path: 'comments.user' } });

    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }

    // Check if user is an accepted member
    const isMember = project.members.some(m => {
      const memberId = m.user._id || m.user; // Handle both populated and unpopulated
      return memberId.toString() === req.user._id.toString() && 
             m.status === 'Accepted';
    }
    );
    if (!isMember) return res.status(401).json({ msg: 'Not authorized. Please accept the invitation first.' });

    let commits = await Commit.find({ projectId: req.params.id }).sort({ timestamp: -1 });
    
    // AUTO-SYNC: If no commits exist, try to fetch from GitHub API (Public Repos)
    if (commits.length === 0 && project.repoUrl) {
      try {
        // Clean URL and extract owner/repo
        const cleanUrl = project.repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
        const urlParts = cleanUrl.split('/');
        const owner = urlParts[urlParts.length - 2];
        const repo = urlParts[urlParts.length - 1];
        
        if (owner && repo) {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
            headers: { 'User-Agent': 'GroupProjectTracker' }
          });
          
          if (response.ok) {
            const data = await response.json();
            const newCommits = data.map(c => ({
              projectId: project._id,
              committerName: c.commit.author.name,
              message: c.commit.message,
              timestamp: c.commit.author.date,
              url: c.html_url
            }));
            
            if (newCommits.length > 0) {
              await Commit.insertMany(newCommits);
              commits = newCommits; // Update variable to return to frontend
            }
          }
        }
      } catch (err) {
        console.error("Auto-sync failed:", err.message);
        // Continue without crashing, just return empty commits
      }
    }

    res.json({ project, commits });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Add a Task
// @route   POST /api/projects/:id/tasks
exports.addTask = async (req, res) => {
  try {
    const { title, deadline, assigneeId } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ msg: 'Project not found' });
    }
    
    const taskCount = await Task.countDocuments({ project: project._id });

    const newTask = new Task({
      readableId: taskCount + 1,
      title,
      deadline: deadline || undefined,
      assignees: assigneeId ? [assigneeId] : (req.user ? [req.user._id] : []),
      project: project._id,
      status: 'todo',
      history: [{
        user: req.user ? req.user._id : null,
        action: 'Task created'
      }]
    });

    await newTask.save();
    project.tasks.push(newTask._id);
    await project.save();

    // Populate assignee so frontend receives the user object, not just ID
    await newTask.populate('assignees');
    await newTask.populate('history.user');
    await newTask.populate('comments.user');

    const io = req.app.get('io');
    io.to(project._id.toString()).emit('task-updated', newTask);

    res.json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update Task Status (Drag & Drop)
// @route   PUT /api/projects/:id/tasks/:taskId
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.taskId);
    
    if (task) {
      let action = `Moved to ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      if (status === 'At Risk') action = '🚨 Flagged as At Risk';
      if (status === 'done') action = '✅ Marked Done';

      task.status = status;
      task.history.push({
        user: req.user._id,
        action
      });
      await task.save();
    
      await task.populate('assignees');
      await task.populate('history.user');
      await task.populate('comments.user');
    }

    const io = req.app.get('io');
    io.to(req.params.id).emit('task-updated', task); // Real-time update
    res.json(task);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Toggle Task Assignment
// @route   PUT /api/projects/:id/tasks/:taskId/assign
exports.assignTask = async (req, res) => {
  try {
    const { userId } = req.body;
    const task = await Task.findById(req.params.taskId);
    const user = await User.findById(userId);

    if (!task || !user) return res.status(404).json({ msg: 'Task or User not found' });

    const isAssigned = task.assignees.some(id => id.toString() === userId);
    
    if (isAssigned) {
      task.assignees = task.assignees.filter(id => id.toString() !== userId);
      task.history.push({ user: req.user._id, action: `Unassigned ${user.username}` });
    } else {
      task.assignees.push(userId);
      task.history.push({ user: req.user._id, action: `Assigned to ${user.username}` });

      // Create Notification
      const notification = new Notification({
        recipient: userId,
        sender: req.user._id,
        type: 'task_assigned',
        message: `${req.user.username} assigned you to task: ${task.title}`,
        project: req.params.id
      });
      await notification.save();
      const io = req.app.get('io');
      io.to(userId).emit('notification', notification);
    }

    await task.save();
    await task.populate('assignees');
    await task.populate('history.user');
    await task.populate('comments.user');

    const io = req.app.get('io');
    io.to(req.params.id).emit('task-updated', task);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Add Comment to Task
// @route   POST /api/projects/:id/tasks/:taskId/comments
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findById(req.params.taskId);
    
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    // Check for @mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...text.matchAll(mentionRegex)].map(match => match[1]);

    if (mentions.length > 0) {
      const uniqueMentions = [...new Set(mentions)];
      const mentionedUsers = await User.find({ username: { $in: uniqueMentions } });
      const io = req.app.get('io');

      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser._id.toString() !== req.user._id.toString()) {
          const notification = new Notification({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            message: `${req.user.username} mentioned you in task: ${task.title}`,
            project: req.params.id
          });
          await notification.save();
          io.to(mentionedUser._id.toString()).emit('notification', notification);
        }
      }
    }

    task.comments.push({
      user: req.user._id,
      text
    });

    await task.save();
    
    await task.populate('assignees');
    await task.populate('history.user');
    await task.populate('comments.user');

    const io = req.app.get('io');
    io.to(req.params.id).emit('task-updated', task);

    res.json(task);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Manually sync commits from GitHub
// @route   POST /api/projects/:id/sync
exports.syncCommits = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });
    if (!project.repoUrl) return res.status(400).json({ msg: 'No Repo URL configured' });

    // Parse Repo URL
    const cleanUrl = project.repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
    const urlParts = cleanUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];

    if (!owner || !repo) return res.status(400).json({ msg: 'Invalid Repo URL' });

    // Fetch from GitHub
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`, {
      headers: { 'User-Agent': 'GroupProjectTracker' }
    });

    if (!response.ok) return res.status(response.status).json({ msg: 'GitHub API Error' });
    const data = await response.json();

    // Filter duplicates
    const existingCommits = await Commit.find({ projectId: project._id }).select('url');
    const existingUrls = new Set(existingCommits.map(c => c.url));

    const newCommits = data
      .filter(c => !existingUrls.has(c.html_url))
      .map(c => ({
        projectId: project._id,
        committerName: c.commit.author.name,
        message: c.commit.message,
        timestamp: c.commit.author.date,
        url: c.html_url
      }));

    if (newCommits.length > 0) {
      await Commit.insertMany(newCommits);
    }

    // Return fresh list
    const allCommits = await Commit.find({ projectId: project._id }).sort({ timestamp: -1 });
    res.json(allCommits);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    // Check if user is owner
    const isOwner = project.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === 'Owner'
    );

    if (!isOwner) return res.status(401).json({ msg: 'Not authorized' });

    await Project.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Project deleted' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Get all tasks assigned to current user across all projects
// @route   GET /api/projects/tasks/me
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignees: req.user._id })
      .populate('project', 'name')
      .populate('assignees', 'username avatarUrl')
      .sort({ deadline: 1 }); // Sort by deadline ascending

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Nudge a member
// @route   POST /api/projects/:id/nudge
exports.nudgeMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    const notification = new Notification({
      recipient: memberId,
      sender: req.user._id,
      type: 'nudge',
      message: `⚠️ ${req.user.username} nudged you to contribute more in ${project.name}!`,
      project: req.params.id
    });

    await notification.save();
    const io = req.app.get('io');
    io.to(memberId).emit('notification', notification);

    res.json({ msg: 'Nudge sent' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Update Project Details
// @route   PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  try {
    const { name } = req.body;
    const project = await Project.findById(req.params.id);
    
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    const isOwner = project.members.some(
      member => member.user.toString() === req.user._id.toString() && member.role === 'Owner'
    );

    if (!isOwner) return res.status(401).json({ msg: 'Not authorized' });

    if (name) project.name = name;
    
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Leave a project
// @route   POST /api/projects/:id/leave
exports.leaveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    const memberIndex = project.members.findIndex(m => m.user.toString() === req.user._id.toString());
    if (memberIndex === -1) return res.status(400).json({ msg: 'Not a member' });

    if (project.members[memberIndex].role === 'Owner') {
      return res.status(400).json({ msg: 'Owners cannot leave. Delete the project instead.' });
    }

    // Remove member
    project.members.splice(memberIndex, 1);
    await project.save();

    // Unassign from tasks
    await Task.updateMany(
      { project: project._id, assignees: req.user._id },
      { $pull: { assignees: req.user._id } }
    );

    res.json({ msg: 'Left project successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Remove a member (Owner only)
// @route   DELETE /api/projects/:id/members/:userId
exports.removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: 'Project not found' });

    // Check if requester is owner
    const requester = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'Owner') {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    const userIdToRemove = req.params.userId;
    const memberIndex = project.members.findIndex(m => m.user.toString() === userIdToRemove);
    if (memberIndex === -1) return res.status(404).json({ msg: 'Member not found' });

    // Remove member
    project.members.splice(memberIndex, 1);
    await project.save();

    // Unassign from tasks
    await Task.updateMany(
      { project: project._id, assignees: userIdToRemove },
      { $pull: { assignees: userIdToRemove } }
    );

    const updatedProject = await Project.findById(req.params.id).populate('members.user');
    res.json(updatedProject.members);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};