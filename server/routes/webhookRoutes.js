const express = require('express');
const router = express.Router();
const { handleGithubPush } = require('../controllers/webhookController');

router.post('/github-push', handleGithubPush);

module.exports = router;