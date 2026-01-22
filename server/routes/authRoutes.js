const express = require('express');
const passport = require('passport');
const router = express.Router();

// @route   GET /api/auth/github
// @desc    Redirect to GitHub Login
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// @route   GET /api/auth/github/callback
// @desc    Handle the callback from GitHub
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to Frontend Dashboard
    res.redirect('http://localhost:5173/');
  }
);

// @route   GET /api/auth/logout
// @desc    Logout user
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('http://localhost:5173/');
  });
});

// @route   GET /api/auth/current_user
// @desc    Get logged in user data
router.get('/current_user', (req, res) => {
  res.send(req.user);
});

module.exports = router;