"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const cache_1 = require("../utils/cache");
/**
 * High-performance, zero-dependency Rate Limiter middleware
 * Leverages Redis (distributed) or in-memory fallback via CacheService.
 */
function rateLimiter(options) {
    const { windowSeconds, maxRequests, message, keyPrefix = 'rl' } = options;
    return async (req, res, next) => {
        try {
            const forwarded = req.headers['x-forwarded-for'];
            const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
            const routeKey = `${keyPrefix}:${req.baseUrl || ''}${req.path}:${ip}`;
            const currentVal = await cache_1.CacheService.get(routeKey);
            const count = currentVal ? parseInt(currentVal, 10) : 0;
            if (count >= maxRequests) {
                res.setHeader('Retry-After', windowSeconds.toString());
                return res.status(429).json({
                    error: message || `Too many requests. Please try again after ${windowSeconds} seconds.`,
                    retryAfterSeconds: windowSeconds
                });
            }
            await cache_1.CacheService.set(routeKey, (count + 1).toString(), windowSeconds);
            next();
        }
        catch (err) {
            // Fail open so cache errors don't bring down user operations
            console.error('[RateLimit Error]:', err);
            next();
        }
    };
}
