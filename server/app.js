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
const cars_1 = __importDefault(require("./routes/cars"));
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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve uploaded PDF tickets statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
app.use('/downloads', express_1.default.static(path_1.default.join(__dirname, '..', 'downloads')));
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/trains', trains_1.default);
app.use('/api/flights', flights_1.default);
app.use('/api/cars', cars_1.default);
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
// --- PRODUCTION STATIC SERVING ---
if (process.env.NODE_ENV === 'production') {
    // Correctly resolve client/dist from the compiled dist/ directory
    const clientDistPath = path_1.default.join(__dirname, '..', '..', 'client', 'dist');
    app.use(express_1.default.static(clientDistPath));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
    });
}
exports.default = app;
