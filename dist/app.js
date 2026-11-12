"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
require("express-async-errors");
const auth_1 = __importDefault(require("./routes/auth"));
const payments_1 = __importDefault(require("./routes/payments"));
const refunds_1 = __importDefault(require("./routes/refunds"));
const admin_1 = __importDefault(require("./routes/admin"));
const customer_1 = __importDefault(require("./routes/customer"));
const stations_1 = __importDefault(require("./routes/stations"));
const trains_1 = __importDefault(require("./routes/trains"));
const flights_1 = __importDefault(require("./routes/flights"));
const buses_1 = __importDefault(require("./routes/buses"));
const priceRequests_1 = __importDefault(require("./routes/priceRequests"));
const corridors_1 = __importDefault(require("./routes/corridors"));
const contact_1 = __importDefault(require("./routes/contact"));
const settings_1 = __importDefault(require("./routes/settings"));
const coupons_1 = __importDefault(require("./routes/coupons"));
const failedBookings_1 = __importDefault(require("./routes/failedBookings"));
const adminBookings_1 = __importDefault(require("./routes/adminBookings"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const promotions_1 = __importDefault(require("./routes/promotions"));
const testDiagnostics_1 = __importDefault(require("./routes/testDiagnostics"));
const invoice_1 = __importDefault(require("./routes/invoice"));
const compression_1 = __importDefault(require("compression"));
const prisma_1 = require("./prisma");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
app.use((0, compression_1.default)());
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV !== 'production' || origin.startsWith('http://localhost:')) {
            callback(null, true);
        }
        else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// SEC-09: Authenticated PDF Ticket Streaming
app.get('/uploads/ticket_*.pdf', auth_2.requireAuth, async (req, res) => {
    try {
        const filename = path_1.default.basename(req.path);
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { ticketUrl: { contains: filename } }
        });
        if (!booking) {
            return res.status(404).json({ error: 'Ticket document not found' });
        }
        const isOwner = booking.userId === req.user.userId;
        const isPrivileged = req.user.isSuperAdmin || ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(req.user.role);
        if (!isOwner && !isPrivileged) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket.' });
        }
        const filePath = path_1.default.join(__dirname, '..', 'uploads', filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.sendFile(filePath);
    }
    catch (err) {
        console.error('[Ticket Access Error]:', err);
        return res.status(500).json({ error: 'Failed to access ticket' });
    }
});
// Serve public static assets (promo banners, general assets)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
app.use('/downloads', express_1.default.static(path_1.default.join(__dirname, '..', 'downloads')));
app.get('/health', async (req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', db: 'ready' });
    }
    catch {
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
    }
    catch (e) {
        res.json({
            status: 'error',
            message: e.message,
            code: e.code,
            responseStatus: e.response?.status,
            responseData: e.response?.data
        });
    }
});
app.use('/api/trains', trains_1.default);
app.use('/api/flights', flights_1.default);
app.use('/api/buses', buses_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/refunds', refunds_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/customer', customer_1.default);
app.use('/api/stations', stations_1.default);
app.use('/api/price-requests', priceRequests_1.default);
app.use('/api/corridors', corridors_1.default);
app.use('/api/contact', contact_1.default);
app.use('/api/coupons', coupons_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/failed-bookings', failedBookings_1.default);
app.use('/api/admin/bookings/manual', adminBookings_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/promotions', promotions_1.default);
app.use('/api/test', testDiagnostics_1.default);
app.use('/api/invoices', invoice_1.default);
// --- PRODUCTION STATIC SERVING ---
if (process.env.NODE_ENV === 'production') {
    // Correctly resolve client/dist from the compiled dist/ directory
    const clientDistPath = path_1.default.join(__dirname, '..', 'client', 'dist');
    app.use(express_1.default.static(clientDistPath));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
    });
}
exports.default = app;
