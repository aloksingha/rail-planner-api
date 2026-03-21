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

        const response = await axios.get(`${RAILRADAR_BASE_URL}/search/stations?query=${encodeURIComponent(query)}`, {
            headers: {
                'X-Api-Key': getRailRadarKey(),
                'Accept': 'application/json'
            }
        });

        // Forward the exact JSON payload from RailRadar to our frontend
        return res.json(response.data);

    } catch (error: any) {
        console.error('RailRadar API Error:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to fetch stations from RailRadar',
            details: error.response?.data || error.message
        });
    }
});

export default router;
