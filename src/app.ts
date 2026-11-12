import express from 'express';
import cors from 'cors';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import 'express-async-errors';

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import refundRoutes from './routes/refunds';
import adminRoutes from './routes/admin';
import customerRoutes from './routes/customer';
import stationRoutes from './routes/stations';
import trainRoutes from './routes/trains';
import flightRoutes from './routes/flights';
import busRoutes from './routes/buses';
import priceRequestRoutes from './routes/priceRequests';
import corridorsRoutes from './routes/corridors';
import contactRoutes from './routes/contact';
import settingsRoutes from './routes/settings';
import couponRoutes from './routes/coupons';
import failedBookingRoutes from './routes/failedBookings';
import adminBookingRoutes from './routes/adminBookings';
import walletRoutes from './routes/wallet';
import notificationRoutes from './routes/notifications';
import promotionsRoutes from './routes/promotions';
import testDiagnosticsRoutes from './routes/testDiagnostics';
import invoiceRoutes from './routes/invoice';

import compression from 'compression';
import { prisma } from './prisma';
import { requireAuth } from './middleware/auth';

const app = express();
app.disable('x-powered-by');

app.use(compression());

// SEC-20: Backend Defensive HTTP Security Headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

const ALLOWED_ORIGINS = [
    'https://ticketspro.in',
    'https://www.ticketspro.in',
    'https://rail-planner-pro.web.app',
    'https://rail-planner-pro.firebaseapp.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production' || origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true
}));
app.use(express.json());

// SEC-09: Authenticated PDF Ticket Streaming
app.get('/uploads/ticket_*.pdf', requireAuth, async (req, res) => {
    try {
        const filename = path.basename(req.path);
        const booking = await prisma.booking.findFirst({
            where: { ticketUrl: { contains: filename } }
        });

        if (!booking) {
            return res.status(404).json({ error: 'Ticket document not found' });
        }

        const isOwner = booking.userId === req.user!.userId;
        const isPrivileged = req.user!.isSuperAdmin || ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(req.user!.role);
        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket.' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.sendFile(filePath);
    } catch (err: any) {
        console.error('[Ticket Access Error]:', err);
        return res.status(500).json({ error: 'Failed to access ticket' });
    }
});

// Serve public static assets (promo banners, general assets)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, '..', 'downloads')));

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', db: 'ready' });
    } catch {
        res.json({ status: 'ok', db: 'connecting' });
    }
});

app.get('/test-api', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Endpoint disabled in production.' });
    }
    try {
        const axios = require('axios');
        const { getRailRadarKey } = require('./utils/keys');
        const key = getRailRadarKey();
        const start = Date.now();
        const response = await axios.get('https://api.railradar.in/v1/trains/between/ANVT/RDP?date=2026-08-30', {
            headers: { 'Authorization': `Bearer ${key}` },
            timeout: 10000
        });
        const duration = Date.now() - start;
        res.json({ 
            status: 'success', 
            duration, 
            statusText: response.statusText,
            data: response.data 
        });
    } catch (e: any) {
        res.json({ 
            status: 'error', 
            message: e.message, 
            code: e.code, 
            responseStatus: e.response?.status,
            responseData: e.response?.data
        });
    }
});

app.use('/api/trains', trainRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/buses', busRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/price-requests', priceRequestRoutes);
app.use('/api/corridors', corridorsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/failed-bookings', failedBookingRoutes);
app.use('/api/admin/bookings/manual', adminBookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/test', testDiagnosticsRoutes);
app.use('/api/invoices', invoiceRoutes);

// Return JSON 404 for unknown /api/* routes instead of falling through to SPA HTML
app.all('/api/*', (_req, res) => {
    return res.status(404).json({ error: 'API endpoint not found' });
});

// --- PRODUCTION STATIC SERVING ---
if (process.env.NODE_ENV === 'production') {
    // Correctly resolve client/dist from the compiled dist/ directory
    const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientDistPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

export default app;
