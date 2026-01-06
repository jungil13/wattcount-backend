import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Development-only auto-login endpoint
export const autoLogin = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'This endpoint is only available in development mode' });
    }

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Auto-login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        phone_number: user.phone_number,
        full_name: user.full_name,
        role: user.role,
        shared_code: user.shared_code
      }
    });
  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of available test users
export const getTestUsers = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'This endpoint is only available in development mode' });
    }

    const testUsernames = ['admin', 'user1', 'user2', 'user3'];
    const users = [];

    for (const username of testUsernames) {
      const user = await User.findByUsername(username);
      if (user) {
        users.push({
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          phone_number: user.phone_number
        });
      }
    }

    res.json({ users });
  } catch (error) {
    console.error('Get test users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

