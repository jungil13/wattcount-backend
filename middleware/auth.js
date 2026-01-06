import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const requireMainUser = (req, res, next) => {
  if (req.user.role !== 'main_user') {
    return res.status(403).json({ error: 'Main user access required' });
  }
  next();
};

export const requireSharedUser = (req, res, next) => {
  if (req.user.role !== 'shared_user') {
    return res.status(403).json({ error: 'Shared user access required' });
  }
  next();
};


