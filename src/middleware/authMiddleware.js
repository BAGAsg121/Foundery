import jwt from 'jsonwebtoken';
import { getUserRoles } from '../repositories/userRepository.js';

// Middleware to verify JWT token
export const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from token to request object
    req.user = {
      userId: decoded.userId,
      roles: decoded.roles
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Middleware to check if user has admin role
export const admin = async (req, res, next) => {
  try {
    const roles = await getUserRoles(req.user.userId);
    if (!roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Error verifying admin status' });
  }
};

// Middleware to check if user has specific role
export const checkRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userRoles = await getUserRoles(req.user.userId);
      const hasRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRole) {
        return res.status(403).json({ 
          message: `Required roles: ${roles.join(', ')}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Error verifying roles' });
    }
  };
};
