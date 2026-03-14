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
        const INITIAL_SUPER_ADMINS = ['alokjnv.singha3@gmail.com', 'admin@ticketspro.in'];

        // 2. Map existing user or Register
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                // If email is in initial admin list, force role upgrade even for existing users
                role: INITIAL_SUPER_ADMINS.includes(email) ? 'SUPER_ADMIN' : undefined
            },
            create: {
                email,
                passwordHash: 'GOOGLE_OAUTH_USER',
                role: INITIAL_SUPER_ADMINS.includes(email) ? 'SUPER_ADMIN' : 'CUSTOMER'
            }
        });

        // 3. Issue our app's JWT Session
        const token = generateToken(user.id, user.email, user.role);
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });

    } catch (error: any) {
        console.error('Google Auth Error:', error.message || error);
        return res.status(401).json({ error: 'Google Authentication Failed' });
    }
});

// Bootstrap Super Admin Route (For Dev purposes)
import bcrypt from 'bcrypt';
router.post('/bootstrap', async (req, res) => {
    const { email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
        where: { email },
        update: { role: 'SUPER_ADMIN', passwordHash },
        create: { email, passwordHash, role: 'SUPER_ADMIN' }
    });

    return res.json({ success: true, message: `Super admin ${user.email} bootstrapped.` });
});

// Dev endpoint to quickly bypass login for any role
router.get('/dev-bypass-token/:role', async (req, res) => {
    try {
        const { role } = req.params;
        const requestedRole = role.toUpperCase();

        const validRoles = ['CUSTOMER', 'SALES_MANAGER', 'ADMIN', 'SUPER_ADMIN'];
        if (!validRoles.includes(requestedRole)) {
            return res.status(400).json({ error: `Invalid role: ${requestedRole}` });
        }

        // Find existing user OR auto-create one for this role so bypass always works
        let userAccount = await prisma.user.findFirst({ where: { role: requestedRole } });

        if (!userAccount) {
            const emailMap: Record<string, string> = {
                'CUSTOMER': 'customer@ticketpro.dev',
                'SALES_MANAGER': 'sales@ticketpro.dev',
                'ADMIN': 'admin@ticketpro.dev',
                'SUPER_ADMIN': 'superadmin@ticketpro.dev',
            };
            const nameMap: Record<string, string> = {
                'CUSTOMER': 'Demo Customer',
                'SALES_MANAGER': 'Demo Sales Manager',
                'ADMIN': 'Demo Admin',
                'SUPER_ADMIN': 'Demo Super Admin',
            };

            userAccount = await prisma.user.upsert({
                where: { email: emailMap[requestedRole] },
                update: {},
                create: {
                    email: emailMap[requestedRole],
                    name: nameMap[requestedRole],
                    role: requestedRole,
                    passwordHash: 'DEV_BYPASS_ACCOUNT',
                }
            });
        }

        const token = generateToken(userAccount.id, userAccount.email, userAccount.role);
        return res.json({ token, user: { id: userAccount.id, email: userAccount.email, role: userAccount.role } });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export default router;
