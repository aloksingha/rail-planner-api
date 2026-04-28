import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// ── RapidAPI sky-scrapper (existing working key) ────────────────────────────────
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'bf2a3e5aebmsh47dd2454d86a94ep16d33ejsnbc06de274f3b';
const SKYSCRAPPER_HEADERS = {
    'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY,
};

// ── Persistent cache: 6 hours to conserve quota ────────────────────────────────
const flightCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// ── Airport metadata ────────────────────────────────────────────────────────────
const AIRPORT_META: Record<string, { skyId: string; entityId: string; city: string; lat: number; lon: number }> = {
    DEL: { skyId: 'DEL',  entityId: '95673498', city: 'Delhi',         lat: 28.56,  lon: 77.10  },
    BOM: { skyId: 'BOM',  entityId: '95673500', city: 'Mumbai',        lat: 19.08,  lon: 72.86  },
    BLR: { skyId: 'BLR',  entityId: '95673351', city: 'Bangalore',     lat: 13.19,  lon: 77.70  },
    MAA: { skyId: 'MAA',  entityId: '95673493', city: 'Chennai',       lat: 12.99,  lon: 80.16  },
    HYD: { skyId: 'HYD',  entityId: '95673354', city: 'Hyderabad',     lat: 17.23,  lon: 78.42  },
    CCU: { skyId: 'CCU',  entityId: '95673352', city: 'Kolkata',       lat: 22.65,  lon: 88.44  },
    COK: { skyId: 'COK',  entityId: '95673487', city: 'Kochi',         lat: 10.15,  lon: 76.39  },
    GOI: { skyId: 'GOI',  entityId: '95673359', city: 'Goa',           lat: 15.38,  lon: 73.83  },
    JAI: { skyId: 'JAI',  entityId: '95673349', city: 'Jaipur',        lat: 26.82,  lon: 75.81  },
    AMD: { skyId: 'AMD',  entityId: '95673356', city: 'Ahmedabad',     lat: 23.07,  lon: 72.62  },
    PNQ: { skyId: 'PNQ',  entityId: '95673353', city: 'Pune',          lat: 18.58,  lon: 73.90  },
    LKO: { skyId: 'LKO',  entityId: '95673348', city: 'Lucknow',       lat: 26.76,  lon: 80.88  },
    DXB: { skyId: 'DXB',  entityId: '95673506', city: 'Dubai',         lat: 25.25,  lon: 55.36  },
    LHR: { skyId: 'LOND', entityId: '27544008', city: 'London',        lat: 51.47,  lon: -0.46  },
    JFK: { skyId: 'NYCA', entityId: '27537542', city: 'New York',      lat: 40.64,  lon: -73.78 },
    CDG: { skyId: 'PARI', entityId: '27539793', city: 'Paris',         lat: 49.01,  lon: 2.55   },
    SIN: { skyId: 'SIN',  entityId: '95673529', city: 'Singapore',     lat: 1.35,   lon: 103.98 },
    BKK: { skyId: 'BKK',  entityId: '95673472', city: 'Bangkok',       lat: 13.68,  lon: 100.75 },
    LAX: { skyId: 'LAXA', entityId: '27536489', city: 'Los Angeles',   lat: 33.94,  lon: -118.40},
    AUH: { skyId: 'AUH',  entityId: '95673503', city: 'Abu Dhabi',     lat: 24.43,  lon: 54.65  },
    DOH: { skyId: 'DOH',  entityId: '95673510', city: 'Doha',          lat: 25.27,  lon: 51.61  },
    KUL: { skyId: 'KUL',  entityId: '95673462', city: 'Kuala Lumpur',  lat: 2.74,   lon: 101.70 },
    SYD: { skyId: 'SYD',  entityId: '95673512', city: 'Sydney',        lat: -33.94, lon: 151.18 },
    FRA: { skyId: 'FRA',  entityId: '95673397', city: 'Frankfurt',     lat: 50.03,  lon: 8.57   },
};

const AIRLINE_NAMES: Record<string, string> = {
    AI: 'Air India',      '6E': 'IndiGo',        UK: 'Vistara',
    SG: 'SpiceJet',       G8: 'Go First',         QP: 'Akasa Air',
    IX: 'Air Asia India', EK: 'Emirates',         EY: 'Etihad',
    QR: 'Qatar Airways',  SQ: 'Singapore Air',    TG: 'Thai Airways',
    MH: 'Malaysia Airlines', BA: 'British Airways', AF: 'Air France',
    LH: 'Lufthansa',      AA: 'American',         UA: 'United Airlines',
};

// ── Haversine distance ──────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Route-accurate realistic estimations ───────────────────────────────────────
// Known real BLR-CCU: SpiceJet SG direct ~2h25m from ₹8,179; Akasa Air ~2h45m ₹10,137
// Our formula: (distKm/750*60)+20 min = BLR-CCU = (1724/750*60)+20 = 158 min = 2h38m ≈ correct
function generateSmartMock(srcCode: string, dstCode: string, flightDate: string, currency: string, cabinClass: string): any[] {
    const src = AIRPORT_META[srcCode] || { city: srcCode, lat: 20, lon: 78, skyId: srcCode, entityId: '', };
    const dst = AIRPORT_META[dstCode] || { city: dstCode, lat: 22, lon: 88, skyId: dstCode, entityId: '', };

    const distKm = haversineKm(src.lat, src.lon, dst.lat, dst.lon);
    // Base flight time: distance/750kmh + 20min overhead
    const baseFlightMin = Math.round((distKm / 750) * 60) + 20;

    const classMulti: Record<string, number> = { economy: 1, business: 3.2, first: 5.5 };
    const cm = classMulti[cabinClass.toLowerCase()] || 1;
    // Price: ~₹4.8/km base + ₹800 fixed + class multiplier
    const baseFareINR = Math.round(((distKm * 4.8 + 800) * cm) / 50) * 50;

    const currencyRates: Record<string, number> = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095, AED: 0.044 };
    const rate = currencyRates[currency.toUpperCase()] ?? 1;

    const isIntl = src.lat && dst.lat && Math.abs(src.lon - dst.lon) > 30;
    const airlines = isIntl
        ? [
            { code: 'AI', name: 'Air India' }, { code: 'EK', name: 'Emirates' },
            { code: 'QR', name: 'Qatar Airways' }, { code: 'EY', name: 'Etihad' },
            { code: 'SQ', name: 'Singapore Air' },
          ]
        : [
            { code: 'SG', name: 'SpiceJet' },  { code: 'QP', name: 'Akasa Air' },
            { code: '6E', name: 'IndiGo' },    { code: 'AI', name: 'Air India' },
            { code: 'UK', name: 'Vistara' },
          ];

    // Real-world departure times for domestic Indian routes
    const depTimes = [
        [6, 5], [7, 30], [9, 0], [10, 40], [12, 15],
        [14, 35], [16, 0], [18, 20],
    ];

    const [year, month, day] = flightDate.split('-').map(Number);

    return depTimes.map(([depH, depM], i) => {
        const al = airlines[i % airlines.length];
        // Direct flights are shorter routes; longer routes may have 1 stop on some timings
        const stops = (distKm < 1000) ? 0 : (i % 4 === 0 ? 1 : 0);
        const durMin = stops === 1 ? baseFlightMin + 75 : baseFlightMin + (i % 3) * 8;

        const depDate = new Date(year, month - 1, day, depH, depM);
        const arrDate = new Date(depDate.getTime() + durMin * 60000);

        const pad = (n: number) => String(n).padStart(2, '0');
        const depStr = `${pad(depH)}:${pad(depM)}`;
        const arrStr = `${pad(arrDate.getHours())}:${pad(arrDate.getMinutes())}`;
        const durStr = `${Math.floor(durMin / 60)}h ${durMin % 60}m`;

        // Price increases for later/peak timings, and for i
        const peakIdx = [0, 3, 5].includes(i) ? 1.12 : 1;
        const priceINR = Math.round((baseFareINR * (1 + i * 0.07) * peakIdx) / 50) * 50;
        const price = currency.toUpperCase() === 'INR' ? priceINR : parseFloat((priceINR * rate).toFixed(2));

        return {
            id: `EST-${srcCode}-${dstCode}-${i}`,
            airline: al.name,
            airlineCode: al.code,
            flightNo: `${al.code}${180 + i * 19}`,
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
            score: 0.95 - i * 0.04,
            tags: i === 0 ? ['cheapest'] : (i === 1 ? ['best'] : []),
            isMock: true,
        };
    });
}

const formatTime = (isoDateTime: string): string => {
    if (!isoDateTime) return '—';
    try { return isoDateTime.split('T')[1]?.substring(0, 5) || '—'; }
    catch { return '—'; }
};

/**
 * GET /api/flights/search
 * Primary: sky-scrapper via RapidAPI (cached 6h to protect quota)
 * Fallback: Route-accurate estimated prices
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
        const isRoundTrip = tripType === 'roundtrip' && !!returnDate;

        // Cache check — VERY important to protect the limited quota
        const cacheKey = `${srcUpper}-${dstUpper}-${flightDate}-${adults}-${cabinClass}-${tripType}-${returnDate || ''}`;
        const cached = flightCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[FlightCache] HIT: ${cacheKey}`);
            return res.json(cached.data);
        }

        let results: any[] = [];
        let isMock = false;

        const srcInfo = AIRPORT_META[srcUpper];
        const dstInfo = AIRPORT_META[dstUpper];

        if (srcInfo && dstInfo) {
            try {
                const apiParams = new URLSearchParams({
                    originSkyId: srcInfo.skyId,
                    destinationSkyId: dstInfo.skyId,
                    originEntityId: srcInfo.entityId,
                    destinationEntityId: dstInfo.entityId,
                    date: flightDate,
                    cabinClass: cabinClass.toLowerCase(),
                    adults,
                    sortBy: sortBy === 'price' ? 'price_low' : (sortBy === 'fastest' ? 'fastest' : 'best'),
                    currency: currency.toUpperCase(),
                    market: 'en-IN',
                    countryCode: 'IN',
                });

                if (isRoundTrip) apiParams.append('returnDate', returnDate!);

                const endpoint = isRoundTrip ? 'searchFlightsRoundtrip' : 'searchFlights';
                const response = await axios.get(
                    `https://sky-scrapper.p.rapidapi.com/api/v1/flights/${endpoint}?${apiParams.toString()}`,
                    { headers: SKYSCRAPPER_HEADERS, timeout: 25000 }
                );

                if (response.data?.status) {
                    let itineraries: any[] = response.data?.data?.itineraries || [];

                    // Apply directOnly filter
                    if (directOnly === 'true') {
                        itineraries = itineraries.filter((it: any) =>
                            it.legs?.every((leg: any) => (leg.stopCount || 0) === 0)
                        );
                    }

                    results = itineraries.map((it: any) => {
                        const leg = it.legs?.[0] || {};
                        const firstSeg = leg.segments?.[0] || {};
                        const alCode = String(firstSeg.marketingCarrier?.id || '').replace(/^-/, '');
                        const alName = AIRLINE_NAMES[alCode] || firstSeg.marketingCarrier?.name || alCode;

                        return {
                            id: it.id,
                            airline: alName,
                            airlineCode: alCode,
                            flightNo: `${alCode}${firstSeg.flightNumber || '—'}`,
                            sourceCity: leg.origin?.city || srcInfo.city,
                            sourceCode: leg.origin?.displayCode || srcUpper,
                            destCity: leg.destination?.city || dstInfo.city,
                            destCode: leg.destination?.displayCode || dstUpper,
                            departure: formatTime(leg.departure),
                            arrival: formatTime(leg.arrival),
                            duration: `${Math.floor((leg.durationInMinutes || 0) / 60)}h ${(leg.durationInMinutes || 0) % 60}m`,
                            durationMinutes: leg.durationInMinutes || 0,
                            stops: leg.stopCount ?? 0,
                            price: Math.round(it.price?.raw || 0),
                            currency: currency.toUpperCase(),
                            priceFormatted: it.price?.formatted,
                            isRefundable: it.farePolicy?.isCancellationAllowed ?? false,
                            seatsLeft: it.legs?.[0]?.segments?.length ? '—' : '—',
                            score: it.score || 0.8,
                            tags: it.tags || [],
                            isMock: false,
                        };
                    });
                }
            } catch (apiErr: any) {
                console.error('[FlightSearch] sky-scrapper error:', apiErr.response?.status, apiErr.message);
            }
        }

        if (results.length === 0) {
            console.warn('[FlightSearch] Using estimated data for', srcUpper, '→', dstUpper);
            results = generateSmartMock(srcUpper, dstUpper, flightDate, currency, cabinClass);
            isMock = true;
        }

        if (sortBy === 'price') results.sort((a, b) => a.price - b.price);
        else if (sortBy === 'fastest') results.sort((a, b) => (a.durationMinutes || 9999) - (b.durationMinutes || 9999));

        const finalResponse = { success: true, count: results.length, data: results, isMock };

        // Cache real results for 6h, mock for 0 (re-generate each time to reflect date)
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
