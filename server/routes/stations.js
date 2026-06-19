"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const keys_1 = require("../utils/keys");
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';
// Helper to sort stations by placing those with matching codes first
const sortStationsByCode = (stations, queryStr) => {
    const q = queryStr.toUpperCase().trim();
    if (!q)
        return stations;
    return [...stations].sort((a, b) => {
        const aCode = (a.code || '').toUpperCase().trim();
        const bCode = (b.code || '').toUpperCase().trim();
        // 1. Exact match on code
        const aExact = aCode === q;
        const bExact = bCode === q;
        if (aExact && !bExact)
            return -1;
        if (!aExact && bExact)
            return 1;
        // 2. Starts with query
        const aStarts = aCode.startsWith(q);
        const bStarts = bCode.startsWith(q);
        if (aStarts && !bStarts)
            return -1;
        if (!aStarts && bStarts)
            return 1;
        // 3. Contains query
        const aContains = aCode.includes(q);
        const bContains = bCode.includes(q);
        if (aContains && !bContains)
            return -1;
        if (!aContains && bContains)
            return 1;
        return 0;
    });
};
// Internal Route: /api/stations/search?query=val
router.get('/search', async (req, res) => {
    try {
        let { query } = req.query;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid query parameter' });
        }
        // Sanitize: If query is in format "Name [CODE]", extract just "CODE"
        const codeMatch = query.match(/\[([A-Z0-9]+)\]/i);
        if (codeMatch) {
            query = codeMatch[1];
        }
        // --- ENGINE 1: RAILRADAR (Primary) ---
        const maxRetries = 3;
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            const key = (0, keys_1.getRailRadarKey)();
            try {
                const response = await axios_1.default.get(`${RAILRADAR_BASE_URL}/search/stations?query=${encodeURIComponent(query)}`, {
                    headers: {
                        'X-Api-Key': key,
                        'Accept': 'application/json'
                    },
                    timeout: 4000
                });
                if (response.data?.success && response.data?.data?.stations?.length > 0) {
                    console.log(`[Stations] RailRadar HIT for "${query}"`);
                    const sorted = sortStationsByCode(response.data.data.stations, query);
                    return res.json({
                        success: true,
                        data: {
                            stations: sorted
                        }
                    });
                }
            }
            catch (e) {
                lastError = e;
                const status = e.response?.status;
                if (status === 401 || status === 403 || status === 429) {
                    console.warn(`[Stations] RailRadar Key failed (${status}), trying next...`);
                    continue;
                }
            }
        }
        // --- ENGINE 2: RAPIDAPI (Fallback) ---
        try {
            const response = await axios_1.default.get(`https://irctc1.p.rapidapi.com/api/v2/searchStation?query=${encodeURIComponent(query)}`, {
                headers: {
                    'x-rapidapi-key': keys_1.NEW_API_KEY,
                    'x-rapidapi-host': 'irctc1.p.rapidapi.com',
                    'Accept': 'application/json'
                },
                timeout: 4000
            });
            if (response.data?.status && response.data?.data?.length > 0) {
                console.log(`[Stations] RapidAPI HIT for "${query}"`);
                const mappedStations = response.data.data.map((s) => ({
                    code: s.code,
                    name: s.name
                }));
                const sorted = sortStationsByCode(mappedStations, query);
                return res.json({
                    success: true,
                    data: {
                        stations: sorted
                    }
                });
            }
        }
        catch (e) {
            console.warn(`[Stations] RapidAPI failed for "${query}": ${e.message}`);
        }
        throw lastError || new Error('All station APIs failed');
    }
    catch (error) {
        console.error('Station Search Error:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to fetch stations',
            details: error.response?.data || error.message
        });
    }
});
exports.default = router;
