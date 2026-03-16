import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../prisma';
import { generateToken } from '../middleware/auth';

const router = Router();

// Load the Google Client ID from environment or use a dummy placeholder
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '104332986423-dummy-client-id.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Missing Google credential token' });
    }

    try {
        // 1. Verify the Google Token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new Error('Invalid Google payload');
        }

        const email = payload.email;
        // Capture name with fallbacks
        const name = payload.name || 
                     (payload.given_name ? `${payload.given_name} ${payload.family_name || ''}`.trim() : null);
        
        const INITIAL_SUPER_ADMINS = ['alokjnv.singha3@gmail.com', 'admin@ticketspro.in'];

        // 2. Map existing user or Register
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                name,
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

        // 3. Issue our app's JWT Session
        const token = generateToken(user.id, user.email, user.role, user.name);
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });

    } catch (error: any) {
        console.error('Google Auth Error:', error.message || error);
        return res.status(401).json({ error: 'Google Authentication Failed' });
    }
});

export default router;
