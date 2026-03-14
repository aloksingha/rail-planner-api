import express from 'express';
import { prisma } from './prisma';
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

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded PDF tickets statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

// Debug endpoint to check registered routes
app.get('/api/debug-routes', (req, res) => {
    const routes: string[] = [];
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
            routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            const prefix = middleware.regexp.toString()
                .replace('\\/', '/')
                .replace('/^', '')
                .replace('/?(?=/|$)/i', '')
                .replace('\\/', '/');
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    routes.push(`${Object.keys(handler.route.methods).join(',').toUpperCase()} ${prefix}${handler.route.path}`);
                }
            });
        }
    });
    res.json({ routes });
});

app.get('/api/debug-prisma', (req, res) => {
    const props = Object.keys(prisma);
    const models = props.filter(p => !p.startsWith('_') && typeof (prisma as any)[p] === 'object');
    res.json({ 
        properties: props,
        models: models,
        hasCorridorPricing: !!(prisma as any).corridorPricing
    });
});

export default app;
