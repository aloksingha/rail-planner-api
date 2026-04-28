import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// ── Kiwi.com Tequila API (free, no credit card needed) ─────────────────────────
// Register at: https://tequila.kiwi.com/ to get your own key
// Falls back to route-accurate realistic data if API fails.
const TEQUILA_KEY = process.env.TEQUILA_API_KEY || 'kH4tMzGqBXjRvYnELpsDcWoO';
const TEQUILA_BASE = 'https://api.tequila.kiwi.com/v2';

// ── In-memory cache (15 min) ───────────────────────────────────────────────────
const flightCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000;

// ── Airport metadata ────────────────────────────────────────────────────────────
const AIRPORT_META: Record<string, { city: string; country: string; lat: number; lon: number }> = {
    DEL: { city: 'Delhi',        country: 'IN', lat: 28.56,  lon: 77.10  },
    BOM: { city: 'Mumbai',       country: 'IN', lat: 19.08,  lon: 72.86  },
    BLR: { city: 'Bangalore',    country: 'IN', lat: 13.19,  lon: 77.70  },
    MAA: { city: 'Chennai',      country: 'IN', lat: 12.99,  lon: 80.16  },
    HYD: { city: 'Hyderabad',    country: 'IN', lat: 17.23,  lon: 78.42  },
    CCU: { city: 'Kolkata',      country: 'IN', lat: 22.65,  lon: 88.44  },
    COK: { city: 'Kochi',        country: 'IN', lat: 10.15,  lon: 76.39  },
    GOI: { city: 'Goa',          country: 'IN', lat: 15.38,  lon: 73.83  },
    JAI: { city: 'Jaipur',       country: 'IN', lat: 26.82,  lon: 75.81  },
    AMD: { city: 'Ahmedabad',    country: 'IN', lat: 23.07,  lon: 72.62  },
    ATQ: { city: 'Amritsar',     country: 'IN', lat: 31.70,  lon: 74.79  },
    PNQ: { city: 'Pune',         country: 'IN', lat: 18.58,  lon: 73.90  },
    IXC: { city: 'Chandigarh',   country: 'IN', lat: 30.67,  lon: 76.78  },
    LKO: { city: 'Lucknow',      country: 'IN', lat: 26.76,  lon: 80.88  },
    DXB: { city: 'Dubai',        country: 'AE', lat: 25.25,  lon: 55.36  },
    LHR: { city: 'London',       country: 'GB', lat: 51.47,  lon: -0.46  },
    JFK: { city: 'New York',     country: 'US', lat: 40.64,  lon: -73.78 },
    CDG: { city: 'Paris',        country: 'FR', lat: 49.01,  lon: 2.55   },
    SIN: { city: 'Singapore',    country: 'SG', lat: 1.35,   lon: 103.98 },
    BKK: { city: 'Bangkok',      country: 'TH', lat: 13.68,  lon: 100.75 },
    LAX: { city: 'Los Angeles',  country: 'US', lat: 33.94,  lon: -118.40},
    AUH: { city: 'Abu Dhabi',    country: 'AE', lat: 24.43,  lon: 54.65  },
    DOH: { city: 'Doha',         country: 'QA', lat: 25.27,  lon: 51.61  },
    KUL: { city: 'Kuala Lumpur', country: 'MY', lat: 2.74,   lon: 101.70 },
    SYD: { city: 'Sydney',       country: 'AU', lat: -33.94, lon: 151.18 },
    FRA: { city: 'Frankfurt',    country: 'DE', lat: 50.03,  lon: 8.57   },
};

// ── Airline code → name ────────────────────────────────────────────────────────
const AIRLINE_NAMES: Record<string, string> = {
    AI: 'Air India',      '6E': 'IndiGo',        UK: 'Vistara',
    SG: 'SpiceJet',       G8: 'Go First',         IX: 'Air Asia India',
    I5: 'Air Asia India', QP: 'Akasa Air',        S5: 'Star Air',
    EK: 'Emirates',       EY: 'Etihad',           QR: 'Qatar Airways',
    SQ: 'Singapore Air',  TG: 'Thai Airways',     MH: 'Malaysia Airlines',
    BA: 'British Airways',AF: 'Air France',        LH: 'Lufthansa',
    AA: 'American',       UA: 'United Airlines',  DL: 'Delta Airlines',
};

// ── Haversine distance (km) ────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// ── Route-accurate realistic mock ─────────────────────────────────────────────
function generateSmartMock(srcCode: string, dstCode: string, flightDate: string, currency: string, cabinClass: string): any[] {
    const src = AIRPORT_META[srcCode] || { city: srcCode, country: 'IN', lat: 20, lon: 78 };
    const dst = AIRPORT_META[dstCode] || { city: dstCode, country: 'IN', lat: 22, lon: 88 };

    // Distance-based duration: avg speed ~750 km/h + 30 min overhead
    const distKm = haversineKm(src.lat, src.lon, dst.lat, dst.lon);
    const minFlightMin = Math.round((distKm / 750) * 60) + 30;

    // Base fare in INR based on distance & class
    const classMulti: Record<string, number> = { economy: 1, business: 3.5, first: 6 };
    const cm = classMulti[cabinClass.toLowerCase()] || 1;
    const baseFareINR = Math.round((distKm * 4.5 + 1200) * cm / 100) * 100;

    // Currency conversion approximations
    const currencyRates: Record<string, number> = {
        INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044
    };
    const rate = currencyRates[currency.toUpperCase()] ?? 1;

    const isIntl = src.country !== dst.country;
    const airlines = isIntl
        ? [
            { code: 'AI', name: 'Air India' }, { code: 'EK', name: 'Emirates' },
            { code: 'QR', name: 'Qatar Airways' }, { code: 'EY', name: 'Etihad' },
            { code: 'SQ', name: 'Singapore Air' },
          ]
        : [
            { code: 'AI', name: 'Air India' }, { code: '6E', name: 'IndiGo' },
            { code: 'UK', name: 'Vistara' },   { code: 'SG', name: 'SpiceJet' },
            { code: 'QP', name: 'Akasa Air' },
          ];

    const results: any[] = [];
    const [year, month, day] = flightDate.split('-').map(Number);

    for (let i = 0; i < 8; i++) {
        const al = airlines[i % airlines.length];
        const depHour = 5 + i * 2;
        const depMin = (i % 2 === 0) ? 0 : 30;
        const durMin = minFlightMin + (i % 3) * 25; // slight variation
        const stops = (distKm > 1500 && i % 3 === 0) ? 1 : (distKm > 3000 && i % 2 === 0 ? 1 : 0);

        const depDate = new Date(year, month - 1, day, depHour % 24, depMin);
        const arrDate = new Date(depDate.getTime() + durMin * 60000);

        const pad = (n: number) => String(n).padStart(2, '0');
        const depStr = `${pad(depDate.getHours())}:${pad(depDate.getMinutes())}`;
        const arrStr = `${pad(arrDate.getHours())}:${pad(arrDate.getMinutes())}`;
        const durStr = `${Math.floor(durMin / 60)}h ${durMin % 60}m`;

        const priceINR = baseFareINR + i * Math.round(baseFareINR * 0.08);
        const price = Math.round(priceINR * rate);
        const flightNum = `${al.code}${200 + i * 17}`;

        results.push({
            id: `EST-${srcCode}-${dstCode}-${i}`,
            airline: al.name,
            airlineCode: al.code,
            flightNo: flightNum,
            sourceCity: src.city,
            sourceCode: srcCode,
            destCity: dst.city,
            destCode: dstCode,
            departure: depStr,
            arrival: arrStr,
            duration: durStr,
            durationMinutes: durMin,
            stops,
            price,
            currency: currency.toUpperCase(),
            priceFormatted: `${currency.toUpperCase()} ${price.toLocaleString('en-IN')}`,
            isRefundable: i % 2 === 0,
            seatsLeft: 2 + (i % 9),
            score: 0.95 - i * 0.05,
            tags: i === 0 ? ['cheapest'] : (i === 1 ? ['best'] : []),
            isMock: true,
        });
    }

    return results;
}

const formatTime = (isoOrTime: string): string => {
    if (!isoOrTime) return '—';
    try {
        // Kiwi returns epoch seconds for some fields; handle ISO too
        if (isoOrTime.includes('T')) return isoOrTime.split('T')[1]?.substring(0, 5) || '—';
        return isoOrTime;
    } catch { return '—'; }
};

// ── Convert epoch seconds → HH:MM ─────────────────────────────────────────────
function epochToTime(epochSec: number): string {
    if (!epochSec) return '—';
    const d = new Date(epochSec * 1000);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// ── Min → "Xh Ym" ─────────────────────────────────────────────────────────────
function minToStr(min: number): string {
    return `${Math.floor(min / 60)}h ${min % 60}m`;
}

/**
 * GET /api/flights/search
 * Uses Kiwi.com Tequila API with route-accurate mock fallback.
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const {
            sourceCode = 'DEL',
            destCode = 'BOM',
            date,
            returnDate,
            tripType = 'oneway',
            adults = '1',
            cabinClass = 'economy',
            currency = 'INR',
            directOnly = 'false',
            sortBy = 'best',
        } = req.query as Record<string, string>;

        const srcUpper = sourceCode.toUpperCase().trim();
        const dstUpper = destCode.toUpperCase().trim();
        const flightDate = date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

        const cacheKey = `${srcUpper}-${dstUpper}-${flightDate}-${adults}-${cabinClass}-${tripType}`;
        const cached = flightCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[FlightCache] HIT: ${cacheKey}`);
            return res.json(cached.data);
        }

        let results: any[] = [];
        let isMock = false;

        // ── Kiwi Tequila search ────────────────────────────────────────────────
        try {
            const cabinMap: Record<string, string> = {
                economy: 'M', business: 'C', first: 'F'
            };
            const [fy, fm, fd] = flightDate.split('-');
            const dateFrom = `${fd}/${fm}/${fy}`;
            const dateTo   = dateFrom; // exact date

            const params: Record<string, string | number> = {
                fly_from:     srcUpper,
                fly_to:       dstUpper,
                date_from:    dateFrom,
                date_to:      dateTo,
                adults,
                selected_cabins: cabinMap[cabinClass.toLowerCase()] || 'M',
                curr:         currency.toUpperCase(),
                limit:        '20',
                sort:         sortBy === 'price' ? 'price' : (sortBy === 'fastest' ? 'duration' : 'quality'),
                max_stopovers: directOnly === 'true' ? 0 : 2,
                vehicle_type: 'aircraft',
            };
            if (tripType === 'roundtrip' && returnDate) {
                const [ry, rm, rd] = returnDate.split('-');
                params.return_from = `${rd}/${rm}/${ry}`;
                params.return_to   = `${rd}/${rm}/${ry}`;
            }

            const apiRes = await axios.get(`${TEQUILA_BASE}/search`, {
                headers: { apikey: TEQUILA_KEY },
                params,
                timeout: 20000,
            });

            const data = apiRes.data?.data as any[] || [];

            if (data.length > 0) {
                const srcMeta = AIRPORT_META[srcUpper];
                const dstMeta = AIRPORT_META[dstUpper];

                results = data.map((it: any) => {
                    const route: any[] = it.route || [];
                    const firstSeg = route[0] || {};
                    const lastSeg  = route[route.length - 1] || {};
                    const alCode   = firstSeg.airline || it.airlines?.[0] || '';
                    const alName   = AIRLINE_NAMES[alCode] || alCode;
                    const durMin   = Math.round((it.duration?.departure || it.fly_duration_raw || 0) / 60);

                    return {
                        id: it.id || `K-${Math.random()}`,
                        airline: alName,
                        airlineCode: alCode,
                        flightNo: `${alCode}${firstSeg.flight_no || '—'}`,
                        sourceCity: srcMeta?.city || it.cityFrom || srcUpper,
                        sourceCode: it.flyFrom || srcUpper,
                        destCity: dstMeta?.city || it.cityTo || dstUpper,
                        destCode: it.flyTo || dstUpper,
                        departure: epochToTime(firstSeg.dTime),
                        arrival: epochToTime(lastSeg.aTime),
                        duration: durMin ? minToStr(durMin) : (it.fly_duration || '—'),
                        durationMinutes: durMin,
                        stops: (route.length - 1),
                        price: Math.round(it.price || 0),
                        currency: currency.toUpperCase(),
                        priceFormatted: `${currency.toUpperCase()} ${Math.round(it.price || 0).toLocaleString('en-IN')}`,
                        isRefundable: false,
                        seatsLeft: it.availability?.seats ?? '—',
                        score: it.quality || 0.8,
                        tags: [],
                        isMock: false,
                    };
                });
            }
        } catch (apiErr: any) {
            const detail = apiErr.response?.data?.message || apiErr.message;
            console.error('[FlightSearch] Tequila API error:', detail);
        }

        // ── Fallback to route-accurate mock ───────────────────────────────────
        if (results.length === 0) {
            console.warn('[FlightSearch] Using route-accurate mock for', srcUpper, '→', dstUpper);
            results = generateSmartMock(srcUpper, dstUpper, flightDate, currency, cabinClass);
            isMock = true;
        }

        // Sort
        if (sortBy === 'price')   results.sort((a, b) => a.price - b.price);
        else if (sortBy === 'fastest') results.sort((a, b) => (a.durationMinutes || 9999) - (b.durationMinutes || 9999));

        const finalResponse = { success: true, count: results.length, data: results, isMock };
        if (!isMock) {
            flightCache.set(cacheKey, { data: finalResponse, expiry: Date.now() + CACHE_TTL });
        }

        return res.json(finalResponse);

    } catch (err: any) {
        console.error('[FlightSearch] Fatal:', err.message);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
