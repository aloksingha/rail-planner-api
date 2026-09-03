import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = express.Router();

import { getRailRadarKey, NEW_API_BASE_URL, NEW_API_KEY } from '../utils/keys';
const RAILRADAR_BASE_URL = 'https://api.railradar.in/v1';

interface Station {
    code: string;
    name: string;
}

// Helper to sort stations by placing those with matching codes first
const sortStationsByCode = (stations: Station[], queryStr: string): Station[] => {
    const q = queryStr.toUpperCase().trim();
    if (!q) return stations;

    return [...stations].sort((a, b) => {
        const aCode = (a.code || '').toUpperCase().trim();
        const bCode = (b.code || '').toUpperCase().trim();
        const aName = (a.name || '').toUpperCase().trim();
        const bName = (b.name || '').toUpperCase().trim();

        const getScore = (code: string, name: string) => {
            if (code === q) return 100;
            if (code.startsWith(q)) return 90;
            if (name === q) return 80;
            if (name.startsWith(q)) return 70;
            if (code.includes(q)) return 60;
            if (name.includes(q)) return 50;
            return 0;
        };

        const scoreA = getScore(aCode, aName);
        const scoreB = getScore(bCode, bName);

        if (scoreA !== scoreB) {
            return scoreB - scoreA; // higher score first
        }

        // If scores are tied, sort alphabetically by code, then name
        if (aCode !== bCode) return aCode.localeCompare(bCode);
        return aName.localeCompare(bName);
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
        let lastError: any = null;

        for (let i = 0; i < maxRetries; i++) {
            const key = getRailRadarKey();
            try {
                const response = await axios.get(`${RAILRADAR_BASE_URL}/search/stations?query=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    },
                    timeout: 6000
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
            } catch (e: any) {
                lastError = e;
                const status = e.response?.status;
                if (status === 401 || status === 403 || status === 429) {
                    console.warn(`[Stations] RailRadar Key failed (${status}), trying next...`);
                    continue; 
                }
            }
        }

        // --- ENGINE 3: LOCAL JSON FALLBACK ---
        try {
            console.warn(`[Stations] ALL APIs FAILED! Using local JSON fallback for "${query}"`);
            const localPath = path.join(process.cwd(), 'src/data/stations.json');
            if (fs.existsSync(localPath)) {
                const data = fs.readFileSync(localPath, 'utf8');
                const allStations = JSON.parse(data);
                const q = query.toLowerCase();
                const matched = allStations.filter((s: any) => 
                    s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
                ).slice(0, 10);
                
                if (matched.length > 0) {
                    const sorted = sortStationsByCode(matched, query);
                    return res.json({
                        success: true,
                        data: {
                            stations: sorted
                        }
                    });
                }
            }
        } catch (e: any) {
            console.error(`[Stations] Local JSON fallback failed: ${e.message}`);
        }

        throw lastError || new Error('All station APIs failed');

    } catch (error: any) {
        console.error('Station Search Error:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to fetch stations',
            details: error.response?.data || error.message
        });
    }
});

export default router;
