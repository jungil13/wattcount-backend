import User from '../models/User.js';

export const getAllSharedUsers = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can view all shared users' });
    }

    const users = await User.getAllSharedUsers(req.user.id);
    res.json(users);
  } catch (error) {
    console.error('Get shared users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Main users can update any user, shared users can only update themselves
    if (req.user.role !== 'main_user' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.password;
    delete updates.role;
    delete updates.id;

    const updated = await User.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(id);
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    if (req.user.role !== 'main_user') {
      return res.status(403).json({ error: 'Only main users can deactivate users' });
    }

    const { id } = req.params;
    const deactivated = await User.deactivate(id);
    if (!deactivated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Main users can view any user, shared users can only view themselves
    if (req.user.role !== 'main_user' && parseInt(id) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


