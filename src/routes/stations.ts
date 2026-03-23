import express from 'express';
import axios from 'axios';

const router = express.Router();

import { getRailRadarKey } from '../utils/keys';
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';

// Internal Route: /api/stations/search?query=val
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid query parameter' });
        }

        const maxRetries = 3;
        let lastError: any = null;

        for (let i = 0; i < maxRetries; i++) {
            const key = getRailRadarKey();
            try {
                const response = await axios.get(`${RAILRADAR_BASE_URL}/search/stations?query=${encodeURIComponent(query)}`, {
                    headers: {
                        'X-Api-Key': key,
                        'Accept': 'application/json'
                    }
                });
                return res.json(response.data);
            } catch (e: any) {
                lastError = e;
                const status = e.response?.status;
                if (status === 401 || status === 403 || status === 429) {
                    console.warn(`[Stations] Key failed with status ${status}, trying next...`);
                    continue; // Try next key
                }
                throw e; // Critical error
            }
        }

        throw lastError || new Error('All API retries failed');

    } catch (error: any) {
        console.error('RailRadar API Error:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to fetch stations from RailRadar',
            details: error.response?.data || error.message
        });
    }
});

export default router;
