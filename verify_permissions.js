import 'dotenv/config';
import { readPool } from './src/lib/db.js';
import { getUserPermissions } from './src/repositories/userRepository.js';

async function verify() {
    try {
        console.log('Verifying permissions...');

        // 1. Get admin user
        const [users] = await readPool.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
        if (users.length === 0) {
            console.log('No admin user found with email admin@example.com');

            // Try finding any user with admin role
            console.log('Searching for any user with admin role...');
            const [adminRoles] = await readPool.query('SELECT id FROM roles WHERE name = "admin"');
            if (adminRoles.length === 0) {
                console.error('Critical: Admin role not found in DB!');
                process.exit(1);
            }
            const adminRoleId = adminRoles[0].id;

            const [userRoles] = await readPool.query('SELECT user_id FROM user_roles WHERE role_id = ? LIMIT 1', [adminRoleId]);
            if (userRoles.length === 0) {
                console.error('No users assigned to admin role!');
                process.exit(1);
            }

            const userId = userRoles[0].user_id;
            console.log(`Found admin user ID: ${userId}`);

            // 2. Check permissions
            const permissions = await getUserPermissions(userId);
            console.log('Permissions for user:', permissions);

            if (permissions.includes('can_submit_forms')) {
                console.log('✅ SUCCESS: User has "can_submit_forms" permission');
            } else {
                console.error('❌ FAILURE: User missing "can_submit_forms" permission');
            }

        } else {
            const user = users[0];
            console.log(`Found admin user: ${user.email} (${user.id})`);

            // 2. Check permissions
            const permissions = await getUserPermissions(user.id);
            console.log('Permissions for user:', permissions);

            if (permissions.includes('can_submit_forms')) {
                console.log('✅ SUCCESS: User has "can_submit_forms" permission');
            } else {
                console.error('❌ FAILURE: User missing "can_submit_forms" permission');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
