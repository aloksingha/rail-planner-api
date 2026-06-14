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
import carRoutes from './routes/cars';
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

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded PDF tickets statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, '..', 'downloads')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/trains', trainRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/cars', carRoutes);

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

// --- PRODUCTION STATIC SERVING ---
if (process.env.NODE_ENV === 'production') {
    // Correctly resolve client/dist from the compiled dist/ directory
    const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
    app.use(express.static(clientDistPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

export default app;
