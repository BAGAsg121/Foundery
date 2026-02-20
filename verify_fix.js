import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function testLogin() {
    try {
        console.log('Testing login...');
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'hashed_password_here' // note: this might fail if password is not actually this in DB
        });

        console.log('Login response:', JSON.stringify(response.data, null, 2));

        if (response.data.user.permissions && response.data.user.permissions.includes('can_submit_forms')) {
            console.log('SUCCESS: Permissions found in user object!');
        } else {
            console.error('FAILURE: Permissions missing or incorrect.');
        }
    } catch (error) {
        if (error.response) {
            console.error('Login failed:', error.response.status, error.response.data);
        } else {
            console.error('Login failed:', error.message);
        }
    }
}

testLogin();
