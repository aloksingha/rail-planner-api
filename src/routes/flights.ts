import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// ── FlightAPI.io (New Primary API) ──────────────────────────────────────────
// Primary: https://api.flightapi.io/onewaytrip/{API_KEY}/{ORIGIN}/{DESTINATION}/{DATE}/{ADULTS}/{CHILDREN}/{INFANTS}/{CABIN}/{CURRENCY}
const FLIGHTAPI_KEY = '69ed152c276f54b7f4206a2f';
const FLIGHTAPI_BASE = 'https://api.flightapi.io';

// ── RapidAPI sky-scrapper (Held temporarily) ────────────────────────────────
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

// ── Route-accurate realistic estimations (Fallback only) ───────────────────────
function generateSmartMock(srcCode: string, dstCode: string, flightDate: string, currency: string, cabinClass: string): any[] {
    const src = AIRPORT_META[srcCode] || { city: srcCode, lat: 20, lon: 78, skyId: srcCode, entityId: '', };
    const dst = AIRPORT_META[dstCode] || { city: dstCode, lat: 22, lon: 88, skyId: dstCode, entityId: '', };

    const distKm = haversineKm(src.lat, src.lon, dst.lat, dst.lon);
    const baseFlightMin = Math.round((distKm / 750) * 60) + 20;

    const classMulti: Record<string, number> = { economy: 1, business: 3.2, first: 5.5 };
    const cm = classMulti[cabinClass.toLowerCase()] || 1;
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

    const depTimes = [
        [6, 5], [7, 30], [9, 0], [10, 40], [12, 15],
        [14, 35], [16, 0], [18, 20],
    ];

    const [year, month, day] = flightDate.split('-').map(Number);

    return depTimes.map(([depH, depM], i) => {
        const al = airlines[i % airlines.length];
        const stops = (distKm < 1000) ? 0 : (i % 4 === 0 ? 1 : 0);
        const durMin = stops === 1 ? baseFlightMin + 75 : baseFlightMin + (i % 3) * 8;

        const depDate = new Date(year, month - 1, day, depH, depM);
        const arrDate = new Date(depDate.getTime() + durMin * 60000);

        const pad = (n: number) => String(n).padStart(2, '0');
        const depStr = `${pad(depH)}:${pad(depM)}`;
        const arrStr = `${pad(arrDate.getHours())}:${pad(arrDate.getMinutes())}`;
        const durStr = `${Math.floor(durMin / 60)}h ${durMin % 60}m`;

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
    try {
        // Format: "2026-04-30T20:20:00" -> "20:20"
        return isoDateTime.split('T')[1]?.substring(0, 5) || '—';
    } catch { return '—'; }
};

/**
 * GET /api/flights/search
 * Primary: FlightAPI.io (requested by user)
 * Secondary: sky-scrapper via RapidAPI (held temporarily)
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

        // Cache check
        const cacheKey = `${srcUpper}-${dstUpper}-${flightDate}-${adults}-${cabinClass}-${tripType}-${returnDate || ''}`;
        const cached = flightCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[FlightCache] HIT: ${cacheKey}`);
            return res.json(cached.data);
        }

        let results: any[] = [];
        let isMock = false;

        // ── 1. TRY FlightAPI.io (New Primary) ──────────────────────────────────
        try {
            // URL: https://api.flightapi.io/onewaytrip/{API_KEY}/{ORIGIN}/{DESTINATION}/{DATE}/{ADULTS}/{CHILDREN}/{INFANTS}/{CABIN}/{CURRENCY}
            const cabin = cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1).toLowerCase();
            const url = `${FLIGHTAPI_BASE}/onewaytrip/${FLIGHTAPI_KEY}/${srcUpper}/${dstUpper}/${flightDate}/${adults}/0/0/${cabin}/${currency.toUpperCase()}`;
            
            console.log(`[FlightSearch] Calling FlightAPI.io: ${url}`);
            const response = await axios.get(url, { timeout: 25000 });
            const data = response.data;

            if (data && data.itineraries && Array.isArray(data.itineraries)) {
                const itineraries = data.itineraries;
                const legsMap = new Map(data.legs?.map((l: any) => [l.id, l]) || []);
                const carriersMap = new Map(data.carriers?.map((c: any) => [c.id, c]) || []);

                results = itineraries.map((it: any) => {
                    const legId = it.leg_ids?.[0];
                    const leg = legsMap.get(legId) as any;
                    if (!leg) return null;

                    const carrierId = leg.marketing_carrier_ids?.[0];
                    const carrier = carriersMap.get(carrierId) as any;
                    const alCode = carrier?.display_code || '';
                    const alName = carrier?.name || alCode;

                    const price = Math.round(it.cheapest_price?.amount || it.pricing_options?.[0]?.price?.amount || 0);

                    return {
                        id: it.id,
                        airline: alName,
                        airlineCode: alCode,
                        flightNo: `${alCode}${leg.segment_ids?.length ? '—' : '—'}`, // Flight Number not easily exposed in top-level leg
                        sourceCity: srcUpper, // Simplified
                        sourceCode: srcUpper,
                        destCity: dstUpper, // Simplified
                        destCode: dstUpper,
                        departure: formatTime(leg.departure),
                        arrival: formatTime(leg.arrival),
                        duration: `${Math.floor((leg.duration || 0) / 60)}h ${(leg.duration || 0) % 60}m`,
                        durationMinutes: leg.duration || 0,
                        stops: leg.stop_count ?? 0,
                        price,
                        currency: currency.toUpperCase(),
                        priceFormatted: `${currency.toUpperCase()} ${price.toLocaleString('en-IN')}`,
                        isRefundable: false,
                        seatsLeft: '—',
                        score: it.score || 0.8,
                        tags: [],
                        isMock: false,
                    };
                }).filter(Boolean);

                if (results.length > 0) {
                    console.log(`[FlightSearch] FlightAPI.io SUCCESS: ${results.length} flights`);
                }
            }
        } catch (apiErr: any) {
            console.error('[FlightSearch] FlightAPI.io error:', apiErr.message);
        }

        // ── 2. FALLBACK to sky-scrapper (Held temporarily) ─────────────────────
        if (results.length === 0) {
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

                    const response = await axios.get(
                        `https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights?${apiParams.toString()}`,
                        { headers: SKYSCRAPPER_HEADERS, timeout: 25000 }
                    );

                    if (response.data?.status) {
                        let itineraries: any[] = response.data?.data?.itineraries || [];
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
                                seatsLeft: '—',
                                score: it.score || 0.8,
                                tags: it.tags || [],
                                isMock: false,
                            };
                        });
                    }
                } catch (scrapperErr: any) {
                    console.error('[FlightSearch] sky-scrapper error:', scrapperErr.message);
                }
            }
        }

        // ── 3. FINAL FALLBACK to estimations ──────────────────────────────────
        if (results.length === 0) {
            console.warn('[FlightSearch] All APIs failed. Using estimated data for', srcUpper, '→', dstUpper);
            results = generateSmartMock(srcUpper, dstUpper, flightDate, currency, cabinClass);
            isMock = true;
        }

        // Filtering & Sorting
        if (directOnly === 'true') {
            results = results.filter(f => f.stops === 0);
        }
        if (sortBy === 'price') results.sort((a, b) => a.price - b.price);
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
