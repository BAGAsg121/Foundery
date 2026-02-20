
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import open from 'open';
import destroyer from 'server-destroy';

// Hardcoded for the script usage, or read from env
const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Usage: node scripts/get_refresh_token.js <CLIENT_ID> <CLIENT_SECRET>');
    process.exit(1);
}

const oAuth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

async function main() {
    const server = http.createServer(async (req, res) => {
        try {
            if (req.url.indexOf('/oauth2callback') > -1) {
                const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
                res.end('Authentication successful! You can close this tab and check your terminal.');
                server.destroy();

                const { tokens } = await oAuth2Client.getToken(qs.get('code'));
                console.log('\n✅ REFRESH TOKEN RECEIVED:\n');
                console.log(tokens.refresh_token);
                console.log('\nAdd this to your .env file as GMAIL_REFRESH_TOKEN=...');
            }
        } catch (e) {
            console.error(e);
            res.end('Error during authentication');
            server.destroy();
        }
    }).listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://mail.google.com/',
            prompt: 'consent' // Force refresh token generation
        });
        console.log('Opening browser for authentication...');
        open(authorizeUrl);
    });
    destroyer(server);
}

main().catch(console.error);
