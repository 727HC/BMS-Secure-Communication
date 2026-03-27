const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { userId, password, orgNum } = req.body;

  if (!userId || !password || !orgNum) {
    return res.status(400).json({ error: 'userId, password, orgNum required' });
  }

  try {
    const result = await authService.registerAndEnroll(userId, password, parseInt(orgNum, 10));
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Registration failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { userId, password, orgNum } = req.body;

  if (!userId || !password || !orgNum) {
    return res.status(400).json({ error: 'userId, password, orgNum required' });
  }

  try {
    const result = await authService.login(userId, password, parseInt(orgNum, 10));
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(401).json({ error: 'Authentication failed', detail: err.message });
  }
});

module.exports = router;
