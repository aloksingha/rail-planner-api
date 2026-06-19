"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const google_auth_library_1 = require("google-auth-library");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
// Load the Google Client ID from environment or use a dummy placeholder
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '104332986423-dummy-client-id.apps.googleusercontent.com';
const client = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
const TEST_EMAIL = 'test@ticketspro.in';
const TEST_ADMIN_EMAIL = 'test@railplanner.in';
router.post('/bypass', async (req, res) => {
    const { email, password } = req.body;
    const isNormalTest = email === TEST_EMAIL && password === 'test1234';
    const isAdminTest = email === TEST_ADMIN_EMAIL && password === 'admin1234';
    const isCustomAdminTest = email === 'admin@ticketspro.in' && password === 'admin@733215';
    if (!isNormalTest && !isAdminTest && !isCustomAdminTest) {
        return res.status(403).json({ error: 'Invalid test credentials' });
    }
    try {
        const isSuperAdmin = email === TEST_ADMIN_EMAIL || email === 'admin@ticketspro.in';
        const role = isSuperAdmin ? 'SUPER_ADMIN' : 'CUSTOMER';
        const name = email === 'admin@ticketspro.in'
            ? 'System Admin'
            : (email === TEST_ADMIN_EMAIL ? 'Test Super Admin' : 'Test Payment User');
        const user = await prisma_1.prisma.user.upsert({
            where: { email },
            update: { role },
            create: {
                email,
                name,
                passwordHash: 'TEST_BYPASS_USER',
                role
            }
        });
        const token = (0, auth_1.generateToken)(user.id, user.email, user.role, user.name, user.role === 'SUPER_ADMIN');
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
    catch (error) {
        console.error('Bypass Auth Error:', error.message || error);
        return res.status(500).json({ error: 'Bypass Authentication Failed' });
    }
});
router.post('/google', async (req, res) => {
    const { credential, access_token } = req.body;
    if (!credential && !access_token) {
        return res.status(400).json({ error: 'Missing Google credential or access token' });
    }
    try {
        let payload;
        console.time('[Auth] Google Verify');
        if (credential) {
            // 1a. Verify the Google ID Token (Web)
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        }
        else if (access_token) {
            // 1b. Fetch profile using Access Token (Custom/Native flows)
            const { data } = await axios_1.default.get('https://www.googleapis.com/oauth2/v3/userinfo', {
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
        const INITIAL_SUPER_ADMINS = ['alokjnv.singha3@gmail.com', 'admin@railplanner.in', 'admin@ticketspro.in'];
        // 2. Map existing user or Register
        console.time('[Auth] DB Upsert');
        const user = await prisma_1.prisma.user.upsert({
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
        const token = (0, auth_1.generateToken)(user.id, user.email, user.role, user.name, user.role === 'SUPER_ADMIN');
        return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
    catch (error) {
        console.error('Google Auth Error:', error.message || error);
        return res.status(401).json({ error: 'Google Authentication Failed' });
    }
});
router.post('/impersonate', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { role } = req.body;
    if (!role) {
        return res.status(400).json({ error: 'Role is required for impersonation' });
    }
    const ALLOWED_ROLES = ['ADMIN', 'SALES_MANAGER', 'CUSTOMER', 'SUPER_ADMIN'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role for impersonation' });
    }
    try {
        const user = req.user;
        // Preserve isSuperAdmin flag during mimicry so we skip DB role sync
        const token = (0, auth_1.generateToken)(user.userId, user.email, role, user.name, true);
        console.log(`[Impersonation] Super Admin ${user.email} is now mimicking role: ${role}`);
        return res.json({ token, role });
    }
    catch (error) {
        return res.status(500).json({ error: 'Impersonation failed' });
    }
});
router.post('/impersonate-user/:userId', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { userId } = req.params;
    try {
        const targetUser = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Issue a new token with the target user's role and email, but keep isSuperAdmin flag TRUE
        const token = (0, auth_1.generateToken)(targetUser.id, targetUser.email, targetUser.role, targetUser.name, true);
        console.log(`[Impersonation] Super Admin ${req.user.email} is now mimicking User: ${targetUser.email} (${targetUser.role})`);
        return res.json({ token, role: targetUser.role });
    }
    catch (error) {
        return res.status(500).json({ error: 'User impersonation failed' });
    }
});
router.patch('/profile', auth_1.requireAuth, async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const userId = req.user.userId;
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() },
            select: { id: true, email: true, role: true, name: true }
        });
        const token = (0, auth_1.generateToken)(updatedUser.id, updatedUser.email, updatedUser.role, updatedUser.name, req.user.isSuperAdmin);
        return res.json({
            success: true,
            message: 'Name updated successfully',
            token,
            user: updatedUser
        });
    }
    catch (error) {
        console.error('Update Profile Error:', error.message || error);
        return res.status(500).json({ error: 'Failed to update name' });
    }
});
exports.default = router;
