"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const cache_1 = require("../utils/cache");
const axios_1 = __importDefault(require("axios"));
const keys_1 = require("../utils/keys");
const router = (0, express_1.Router)();
/**
 * 1. Simple Ping / Echo
 * GET /api/test/ping
 */
router.get('/ping', (req, res) => {
    res.json({
        success: true,
        message: 'pong',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
    });
});
/**
 * 2. Database Health & Latency Test
 * GET /api/test/db
 */
router.get('/db', async (req, res) => {
    const startTime = Date.now();
    try {
        // Run a raw query to measure connection & execution roundtrip
        await prisma_1.prisma.$queryRaw `SELECT 1 as ping`;
        const latencyMs = Date.now() - startTime;
        // Fetch basic counts to verify table access
        const [userCount, corridorCount, bookingCount] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.corridorPricing.count(),
            prisma_1.prisma.booking.count().catch(() => 0)
        ]);
        return res.json({
            success: true,
            status: 'HEALTHY',
            latencyMs,
            stats: {
                users: userCount,
                corridors: corridorCount,
                bookings: bookingCount
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            status: 'UNHEALTHY',
            latencyMs: Date.now() - startTime,
            error: error.message || 'Database connection error'
        });
    }
});
/**
 * 3. Cache Diagnostics (Redis or In-Memory)
 * GET /api/test/cache
 */
router.get('/cache', async (req, res) => {
    const testKey = `test_diagnostic_${Date.now()}`;
    const testValue = `diagnostic_value_${Math.random()}`;
    const startTime = Date.now();
    try {
        // Test SET
        await cache_1.CacheService.set(testKey, testValue, 10);
        // Test GET
        const retrievedValue = await cache_1.CacheService.get(testKey);
        // Test DEL
        await cache_1.CacheService.del(testKey);
        const deletedCheck = await cache_1.CacheService.get(testKey);
        const latencyMs = Date.now() - startTime;
        const passed = retrievedValue === testValue && deletedCheck === null;
        return res.json({
            success: passed,
            status: passed ? 'HEALTHY' : 'DEGRADED',
            latencyMs,
            isRedisConfigured: !!process.env.REDIS_URL,
            writeReadDelPassed: passed
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            status: 'UNHEALTHY',
            error: error.message || 'Cache diagnostic failed'
        });
    }
});
/**
 * 4. Upstream Rail Provider Check
 * GET /api/test/upstream
 */
router.get('/upstream', async (req, res) => {
    const startTime = Date.now();
    try {
        const key = (0, keys_1.getRailRadarKey)();
        const response = await axios_1.default.get('https://api.railradar.in/v1/search/stations?query=NDLS', {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Accept': 'application/json'
            },
            timeout: 5000
        });
        const latencyMs = Date.now() - startTime;
        return res.json({
            success: true,
            provider: 'RailRadar',
            status: 'HEALTHY',
            latencyMs,
            statusCode: response.status,
            dataReceived: !!response.data
        });
    }
    catch (error) {
        return res.status(502).json({
            success: false,
            provider: 'RailRadar',
            status: 'UNREACHABLE',
            latencyMs: Date.now() - startTime,
            error: error.message || 'Upstream provider error',
            responseStatus: error.response?.status
        });
    }
});
/**
 * 5. Environment & Configuration Check (Masked Secrets)
 * GET /api/test/env
 */
router.get('/env', (req, res) => {
    const checkVar = (name) => {
        const val = process.env[name];
        return {
            configured: !!val && val.length > 0,
            preview: val ? `${val.substring(0, 4)}...${val.slice(-3)}` : 'NOT_SET'
        };
    };
    const envReport = {
        NODE_ENV: process.env.NODE_ENV || 'development',
        DATABASE_URL: checkVar('DATABASE_URL'),
        REDIS_URL: checkVar('REDIS_URL'),
        JWT_SECRET: checkVar('JWT_SECRET'),
        PORT: process.env.PORT || 5000,
        RAZORPAY_KEY_ID: checkVar('RAZORPAY_KEY_ID'),
        RAZORPAY_KEY_SECRET: checkVar('RAZORPAY_KEY_SECRET')
    };
    return res.json({
        success: true,
        environment: envReport,
        timestamp: new Date().toISOString()
    });
});
/**
 * 6. Combined Full Diagnostic Scorecard
 * GET /api/test/all
 */
router.get('/all', async (req, res) => {
    const results = {};
    // 1. Ping
    results.ping = { status: 'OK', uptime: Math.floor(process.uptime()) };
    // 2. DB
    const dbStart = Date.now();
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        results.database = { status: 'HEALTHY', latencyMs: Date.now() - dbStart };
    }
    catch (e) {
        results.database = { status: 'FAILED', error: e.message };
    }
    // 3. Cache
    try {
        await cache_1.CacheService.set('diag_all_test', 'val', 5);
        const got = await cache_1.CacheService.get('diag_all_test');
        results.cache = { status: got === 'val' ? 'HEALTHY' : 'FAILED' };
    }
    catch (e) {
        results.cache = { status: 'FAILED', error: e.message };
    }
    // 4. Upstream RailRadar
    const upstreamStart = Date.now();
    try {
        const key = (0, keys_1.getRailRadarKey)();
        await axios_1.default.get('https://api.railradar.in/v1/search/stations?query=NDLS', {
            headers: { 'Authorization': `Bearer ${key}` },
            timeout: 5000
        });
        results.upstream = { status: 'HEALTHY', latencyMs: Date.now() - upstreamStart };
    }
    catch (e) {
        results.upstream = { status: 'FAILED', error: e.message };
    }
    const overallHealthy = Object.values(results).every((r) => r.status === 'HEALTHY' || r.status === 'OK');
    return res.status(overallHealthy ? 200 : 207).json({
        success: overallHealthy,
        overallStatus: overallHealthy ? 'ALL_SYSTEMS_OPERATIONAL' : 'DEGRADED',
        diagnostics: results,
        timestamp: new Date().toISOString()
    });
});
/**
 * 7. RailKit Fare Lookup Test
 * GET /api/test/railkit/fare
 */
router.get('/railkit/fare', async (req, res) => {
    const trainNo = req.query.trainNo || '12904';
    const from = req.query.from || 'NZM';
    const to = req.query.to || 'BDTS';
    const date = req.query.date || '18-10-2026';
    const travelClass = req.query.class || '3A';
    const quota = req.query.quota || 'GN';
    const apiKey = process.env.RAILKIT_API_KEY || 'railkit_cb0204e7cffc3b5cfaf811f6ca709344cae8f86899fd845a';
    try {
        let railkit;
        try {
            const importDynamic = new Function('m', 'return import(m)');
            const mod = await importDynamic('railkit');
            railkit = mod.default || mod;
        }
        catch {
            railkit = require('railkit');
        }
        if (typeof railkit?.configure === 'function') {
            railkit.configure(apiKey);
        }
        const result = await railkit.fareLookup(trainNo, from, to, date, travelClass, quota);
        return res.json({
            success: true,
            provider: 'RailKit',
            query: { trainNo, from, to, date, class: travelClass, quota },
            result
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            provider: 'RailKit',
            query: { trainNo, from, to, date, class: travelClass, quota },
            error: error.message || 'RailKit lookup error',
            hint: 'Ensure railkit is installed via npm install railkit and API key is valid.'
        });
    }
});
exports.default = router;
