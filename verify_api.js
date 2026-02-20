import 'dotenv/config';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { readPool } from './src/lib/db.js';

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

async function verify() {
    try {
        console.log('Verifying /api/auth/me endpoint...');

        // 1. Get admin user
        const [users] = await readPool.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        if (users.length === 0) {
            console.log('No admin user found. Cannot proceed.');
            process.exit(1);
        }
        const user = users[0];
        const userId = user.id;

        // 2. Generate token manually (simulating login)
        // We need roles for the token payload as per authController.js: const token = generateToken(user.id, roles);
        // where roles is an array of strings (role names)

        const [rows] = await readPool.query(
            `SELECT r.name 
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
            [userId]
        );
        const roles = rows.map(row => row.name);

        const token = jwt.sign(
            { userId, roles },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Generated token for user:', user.email);

        // 3. Call /api/auth/me
        try {
            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('/api/auth/me response:', JSON.stringify(response.data, null, 2));

            if (response.data.user.permissions && response.data.user.permissions.includes('can_submit_forms')) {
                console.log('✅ SUCCESS: /api/auth/me returned permissions!');
            } else {
                console.error('❌ FAILURE: /api/auth/me response missing permissions.');
            }

        } catch (apiError) {
            console.error('API call failed:', apiError.message);
            if (apiError.response) {
                console.error('Status:', apiError.response.status);
                console.error('Data:', apiError.response.data);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
