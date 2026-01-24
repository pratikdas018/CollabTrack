const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ msg: 'Marked as read' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ msg: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};