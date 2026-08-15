import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
let redisClient: Redis | null = null;

if (REDIS_URL) {
    try {
        redisClient = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            retryStrategy(times) {
                if (times > 3) return null; // stop retrying after 3 times
                return 1000;
            }
        });
        
        redisClient.on('error', (err) => {
            console.error('Redis cache error:', err);
        });
        
        console.log('✅ Redis Cache connected.');
    } catch (error) {
        console.warn('⚠️ Redis connection failed. Falling back to in-memory cache.');
        redisClient = null;
    }
} else {
    console.log('ℹ️ No REDIS_URL provided. Using in-memory cache fallback.');
}

const inMemoryCache = new Map<string, { value: string, expiry: number }>();

export const CacheService = {
    async get(key: string): Promise<string | null> {
        if (redisClient && redisClient.status === 'ready') {
            try {
                return await redisClient.get(key);
            } catch (error) {
                console.error(`Redis get error for key ${key}:`, error);
                // Fallthrough to memory if redis fails during get
            }
        }
        
        const cached = inMemoryCache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.value;
        } else if (cached) {
            inMemoryCache.delete(key);
        }
        return null;
    },
    
    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (redisClient && redisClient.status === 'ready') {
            try {
                await redisClient.set(key, value, 'EX', ttlSeconds);
                return;
            } catch (error) {
                console.error(`Redis set error for key ${key}:`, error);
            }
        }
        
        inMemoryCache.set(key, { value, expiry: Date.now() + (ttlSeconds * 1000) });
    },
    
    async del(key: string): Promise<void> {
        if (redisClient && redisClient.status === 'ready') {
            try {
                await redisClient.del(key);
                return;
            } catch (error) {
                console.error(`Redis del error for key ${key}:`, error);
            }
        }
        inMemoryCache.delete(key);
    }
};
