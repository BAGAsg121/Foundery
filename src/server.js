import 'dotenv/config'; // Must be first — loads .env before other imports
import express from 'express';
import cors from 'cors';
import { signup, login, approveUser, getMe, protect, getUsers, getRoles, updateUserRole, getPendingUsers } from './controllers/authController.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import { testDbConnection } from './lib/db.js';
import { runMigrations } from './lib/migrate.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test DB connection and run migrations on startup
try {
  await testDbConnection();
  console.log('✅ Database connection established successfully');
  await runMigrations();
} catch (error) {
  console.error('❌ Failed to start:', error.message);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.put('/api/auth/approve/:userId', approveUser); // Admin only endpoint
app.get('/api/auth/users', protect, getUsers);
app.get('/api/auth/roles', protect, getRoles);
app.get('/api/auth/pending-users', protect, getPendingUsers);
app.put('/api/auth/users/:userId/role', protect, updateUserRole);
app.get('/api/auth/me', protect, getMe);

// Onboarding routes
app.use('/api/onboarding', onboardingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

export default app;
