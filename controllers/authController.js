import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SharedCode from '../models/SharedCode.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { username, phone_number, password, full_name, role } = req.body;

    if (!username || !phone_number || !password || !full_name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role !== 'main_user' && role !== 'shared_user') {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username or phone number already exists
    const existingUser = await User.findByUsername(username) || await User.findByPhoneNumber(phone_number);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or phone number already exists' });
    }

    let shared_code = null;
    if (role === 'main_user') {
      // Generate a unique shared code for main user
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = await User.generateSharedCode();
        const existing = await User.findBySharedCode(code);
        if (!existing) {
          isUnique = true;
        }
      }
      shared_code = code;
    }

    const userId = await User.create({
      username,
      phone_number,
      password,
      full_name,
      role,
      shared_code
    });

    const user = await User.findById(userId);
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const connectWithSharedCode = async (req, res) => {
  try {
    const { shared_code, username, phone_number, password, full_name } = req.body;

    if (!shared_code || !username || !phone_number || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify shared code
    const codeData = await SharedCode.findByCode(shared_code);
    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired shared code' });
    }

    // Check if username or phone number already exists
    const existingUser = await User.findByUsername(username) || await User.findByPhoneNumber(phone_number);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or phone number already exists' });
    }

    // Create shared user
    const userId = await User.create({
      username,
      phone_number,
      password,
      full_name,
      role: 'shared_user',
      shared_code
    });

    // Mark shared code as used
    await SharedCode.markAsUsed(shared_code, userId);

    const user = await User.findById(userId);
    const token = generateToken(user);

    res.status(201).json({
      message: 'Connected successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        phone_number: user.phone_number,
        full_name: user.full_name,
        role: user.role,
        main_user: {
          id: codeData.main_user_id,
          username: codeData.main_username,
          full_name: codeData.main_full_name
        }
      }
    });
  } catch (error) {
    console.error('Connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateSharedCode = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can generate shared codes' });
    }

    // Generate unique code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = await User.generateSharedCode();
      const existing = await SharedCode.findByCode(code);
      if (!existing) {
        isUnique = true;
      }
    }

    // Set expiration (optional: 30 days from now)
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 30);

    await SharedCode.create({
      code,
      main_user_id: req.user.id,
      expires_at
    });

    res.json({
      message: 'Shared code generated successfully',
      code,
      expires_at
    });
  } catch (error) {
    console.error('Generate code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMySharedCodes = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can view shared codes' });
    }

    const codes = await SharedCode.getActiveCodesByMainUser(req.user.id);
    res.json(codes);
  } catch (error) {
    console.error('Get codes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSharedCode = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can delete shared codes' });
    }

    const { code } = req.params;
    
    // Verify the code belongs to this main user
    const codeData = await SharedCode.findByCode(code);
    if (!codeData || codeData.main_user_id !== req.user.id) {
      return res.status(404).json({ error: 'Shared code not found' });
    }

    if (codeData.is_used) {
      return res.status(400).json({ error: 'Cannot delete a code that has been used' });
    }

    await SharedCode.delete(code);
    res.json({ message: 'Shared code deleted successfully' });
  } catch (error) {
    console.error('Delete code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

