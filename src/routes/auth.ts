import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../prisma';
import { generateToken, requireAuth, requireRole } from '../middleware/auth';
import axios from 'axios';

const router = Router();

// Load the Google Client ID from environment or use a dummy placeholder
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '104332986423-dummy-client-id.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    const { credential, access_token } = req.body;

    if (!credential && !access_token) {
        return res.status(400).json({ error: 'Missing Google credential or access token' });
    }

    try {
        let payload: any;

        console.time('[Auth] Google Verify');
        if (credential) {
            // 1a. Verify the Google ID Token (Web)
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } else if (access_token) {
            // 1b. Fetch profile using Access Token (Custom/Native flows)
            const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            payload = data;
        }
        console.timeEnd('[Auth] Google Verify');

        if (!payload || !payload.email) {
            throw new Error('Invalid Google payload');
        }

        const email = payload.email;
        // Capture name with fallbacks
        const name = payload.name || 
                     (payload.given_name ? `${payload.given_name} ${payload.family_name || ''}`.trim() : null);
        const INITIAL_SUPER_ADMINS = ['alokjnv.singha3@gmail.com', 'admin@ticketspro.in'];

        // 2. Map existing user or Register
        console.time('[Auth] DB Upsert');
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                name, // Update name if it changed or was missing
                // If email is in initial admin list, force role upgrade even for existing users
                role: INITIAL_SUPER_ADMINS.includes(email) ? 'SUPER_ADMIN' : undefined
            },
            create: {
                email,
                name,
                passwordHash: 'GOOGLE_OAUTH_USER',
                role: INITIAL_SUPER_ADMINS.includes(email) ? 'SUPER_ADMIN' : 'CUSTOMER'
            }
        });
        console.timeEnd('[Auth] DB Upsert');

        // 3. Issue our app's JWT Session
        const token = generateToken(user.id, user.email, user.role, user.name);
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });

    } catch (error: any) {
        console.error('Google Auth Error:', error.message || error);
        return res.status(401).json({ error: 'Google Authentication Failed' });
    }
});

router.post('/impersonate', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { role } = req.body;
    if (!role) {
        return res.status(400).json({ error: 'Role is required for impersonation' });
    }

    const ALLOWED_ROLES = ['ADMIN', 'SALES_MANAGER', 'CUSTOMER', 'SUPER_ADMIN'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role for impersonation' });
    }

    try {
        const user = req.user!;
        const token = generateToken(user.userId, user.email, role, user.name);

        console.log(`[Impersonation] Super Admin ${user.email} is now mimicking role: ${role}`);
        return res.json({ token, role });
    } catch (error) {
        return res.status(500).json({ error: 'Impersonation failed' });
    }
});

router.post('/impersonate-user/:userId', requireAuth, requireRole(['SUPER_ADMIN']), async (req, res) => {
    const { userId } = req.params;
    
    try {
        const targetUser = await prisma.user.findUnique({
            where: { id: userId as string }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Issue a new token with the target user's role and email
        const token = generateToken(targetUser.id, targetUser.email, targetUser.role, targetUser.name);

        console.log(`[Impersonation] Super Admin ${req.user!.email} is now mimicking User: ${targetUser.email} (${targetUser.role})`);
        return res.json({ token, role: targetUser.role });
    } catch (error) {
        return res.status(500).json({ error: 'User impersonation failed' });
    }
});

export default router;
