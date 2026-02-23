import { getUserByEmail, createUser, getUserRoles, getUserPermissions, getAllUsers, getAllRoles, updateUserRole as updateUserRoleRepo } from '../repositories/userRepository.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { writePool } from '../lib/db.js';
import { sendEmail } from '../services/emailService.js';

// Generate JWT token
const generateToken = (userId, roles) => {
  return jwt.sign(
    { userId, roles },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '24h' }
  );
};

// Assign default role to user
const assignDefaultRole = async (userId, roleName = 'user') => {
  try {
    // Get role ID
    const [roles] = await writePool.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roles.length === 0) return;

    const roleId = roles[0].id;

    // Assign role
    await writePool.query(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [userId, roleId]
    );
  } catch (error) {
    console.error('Error assigning default role:', error);
  }
};

export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with pending status
    const user = await createUser(email, hashedPassword, 'pending');

    // Assign default 'user' role
    await assignDefaultRole(user.id);

    // Send signup notification email
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'shlok.goswami@eko.co.in',
        subject: 'New User Signup Approval Needed',
        text: `User ${email} has signed up and is awaiting approval.\n\nPlease log in to the admin dashboard to approve or reject this user.`,
      });
      console.log(`📧 Signup notification sent for ${email}`);
    } catch (emailErr) {
      console.error('⚠️  Could not send signup notification email:', emailErr.message);
      // Don't fail signup just because email failed
    }

    res.status(201).json({
      message: 'Account created. Verification pending. You will be notified once approved.',
      userId: user.id
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check user status
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Account pending approval. Please wait for verification.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ message: 'Account has been rejected.' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get user roles and permissions
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    // Generate token
    const token = generateToken(user.id, roles);

    // Return user info and token (exclude password hash)
    const { password_hash, ...userData } = user;

    res.json({
      message: 'Login successful',
      user: {
        ...userData,
        roles,
        permissions
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

// Middleware to protect routes
export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Not authorized' });
  }
};

// Get current user details
export const getMe = async (req, res) => {
  try {
    const user = await getUserByEmail(req.user.email || (await writePool.query('SELECT email FROM users WHERE id = ?', [req.user.userId]))[0][0].email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);

    const { password_hash, ...userData } = user;

    res.json({
      user: {
        ...userData,
        roles,
        permissions
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
};

// Admin approve user
export const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await writePool.query('UPDATE users SET status = "active" WHERE id = ?', [userId]);

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ message: 'Error approving user' });
  }
};

// Get all users (Admin only)
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get all roles (Admin only)
export const getRoles = async (req, res) => {
  try {
    const roles = await getAllRoles();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Error fetching roles' });
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'Role ID is required' });
    }

    await updateUserRoleRepo(userId, roleId);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

// Get pending users (Admin only) - Restoring missing endpoint
export const getPendingUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    const pendingUsers = users.filter(u => u.status === 'pending');
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ message: 'Error fetching pending users' });
  }
};
