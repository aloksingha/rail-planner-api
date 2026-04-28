import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// ── Amadeus for Developers (Free Sandbox) ──────────────────────────────────────
// Free tier: 2,000 calls/month. Register at: https://developers.amadeus.com
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID || 'BEItMbNByJnlE0lERJBW3NjrNKBPjhDr';
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET || 'MHF0tWbFi0GJH2Di';
const AMADEUS_BASE = 'https://test.api.amadeus.com';

// Token cache (expires every 30 min)
let amadeusToken: { token: string; expiry: number } | null = null;

async function getAmadeusToken(): Promise<string> {
    if (amadeusToken && amadeusToken.expiry > Date.now()) return amadeusToken.token;
    const res = await axios.post(
        `${AMADEUS_BASE}/v1/security/oauth2/token`,
        new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: AMADEUS_CLIENT_ID,
            client_secret: AMADEUS_CLIENT_SECRET,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );
    const { access_token, expires_in } = res.data;
    amadeusToken = { token: access_token, expiry: Date.now() + (expires_in - 60) * 1000 };
    return access_token;
}

// ── In-memory cache ────────────────────────────────────────────────────────────
const flightCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ── Airport metadata (IATA codes Amadeus accepts natively) ─────────────────────
const AIRPORT_META: Record<string, { city: string; code: string; name: string }> = {
    DEL: { city: 'Delhi',          code: 'DEL', name: 'Indira Gandhi International' },
    BOM: { city: 'Mumbai',         code: 'BOM', name: 'Chhatrapati Shivaji Maharaj' },
    BLR: { city: 'Bangalore',      code: 'BLR', name: 'Kempegowda International' },
    MAA: { city: 'Chennai',        code: 'MAA', name: 'Chennai International' },
    HYD: { city: 'Hyderabad',      code: 'HYD', name: 'Rajiv Gandhi International' },
    CCU: { city: 'Kolkata',        code: 'CCU', name: 'NSCBI Airport' },
    COK: { city: 'Kochi',          code: 'COK', name: 'Cochin International' },
    GOI: { city: 'Goa',            code: 'GOI', name: 'Goa International' },
    JAI: { city: 'Jaipur',         code: 'JAI', name: 'Jaipur International' },
    AMD: { city: 'Ahmedabad',      code: 'AMD', name: 'Sardar Vallabhbhai Patel' },
    DXB: { city: 'Dubai',          code: 'DXB', name: 'Dubai International' },
    LHR: { city: 'London',         code: 'LHR', name: 'London Heathrow' },
    JFK: { city: 'New York',       code: 'JFK', name: 'John F. Kennedy International' },
    CDG: { city: 'Paris',          code: 'CDG', name: 'Charles de Gaulle' },
    SIN: { city: 'Singapore',      code: 'SIN', name: 'Singapore Changi' },
    BKK: { city: 'Bangkok',        code: 'BKK', name: 'Suvarnabhumi Airport' },
    LAX: { city: 'Los Angeles',    code: 'LAX', name: 'Los Angeles International' },
    AUH: { city: 'Abu Dhabi',      code: 'AUH', name: 'Abu Dhabi International' },
    DOH: { city: 'Doha',           code: 'DOH', name: 'Hamad International' },
    KUL: { city: 'Kuala Lumpur',   code: 'KUL', name: 'Kuala Lumpur International' },
    SYD: { city: 'Sydney',         code: 'SYD', name: 'Kingsford Smith International' },
    FRA: { city: 'Frankfurt',      code: 'FRA', name: 'Frankfurt Airport' },
};

// Airline IATA → name lookup (top carriers)
const AIRLINE_NAMES: Record<string, string> = {
    AI: 'Air India',     '6E': 'IndiGo',       UK: 'Vistara',
    SG: 'SpiceJet',      G8: 'Go First',        IX: 'Air Asia India',
    EK: 'Emirates',      EY: 'Etihad',          QR: 'Qatar Airways',
    SQ: 'Singapore Air', TG: 'Thai Airways',    MH: 'Malaysia Airlines',
    BA: 'British Airways', AF: 'Air France',    LH: 'Lufthansa',
    AA: 'American',      UA: 'United Airlines', DL: 'Delta Airlines',
    '9W': 'Jet Airways', '2T': 'TruJet',
};

const formatTime = (isoDateTime: string): string => {
    if (!isoDateTime) return '—';
    try { return isoDateTime.split('T')[1]?.substring(0, 5) || '—'; }
    catch { return '—'; }
};

const durationToStr = (iso: string): string => {
    // Amadeus uses ISO 8601 duration: PT2H30M
    const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return '—';
    const h = parseInt(match[1] || '0');
    const m = parseInt(match[2] || '0');
    return `${h}h ${m}m`;
};

const durationToMinutes = (iso: string): number => {
    const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    return parseInt(match[1] || '0') * 60 + parseInt(match[2] || '0');
};

// ── Cabin class mapping ────────────────────────────────────────────────────────
const CABIN_MAP: Record<string, string> = {
    economy: 'ECONOMY',
    business: 'BUSINESS',
    first: 'FIRST',
    premium_economy: 'PREMIUM_ECONOMY',
};

// ── Mock generator ─────────────────────────────────────────────────────────────
function generateMockFlights(
    srcCode: string, dstCode: string,
    flightDate: string, currency: string, count = 10
): any[] {
    const src = AIRPORT_META[srcCode] || { city: srcCode, code: srcCode, name: srcCode };
    const dst = AIRPORT_META[dstCode] || { city: dstCode, code: dstCode, name: dstCode };
    const mockAirlines = [
        { code: 'AI', name: 'Air India' }, { code: '6E', name: 'IndiGo' },
        { code: 'UK', name: 'Vistara' }, { code: 'SG', name: 'SpiceJet' },
        { code: 'G8', name: 'Go First' },
    ];
    const INR_BASE = 3500;
    const mult = currency.toUpperCase() === 'INR' ? 1 : (1 / 83);

    return Array.from({ length: count }).map((_, i) => {
        const al = mockAirlines[i % mockAirlines.length];
        const depHour = 5 + (i * 2);
        const durMin = 90 + i * 20;
        const depStr = `${flightDate}T${String(depHour % 24).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}:00`;
        const arrStr = new Date(new Date(depStr).getTime() + durMin * 60000).toISOString().replace(/\.\d+Z$/, '');
        const basePrice = Math.round((INR_BASE + i * 450) * mult);

        return {
            id: `MOCK-${srcCode}-${dstCode}-${i}`,
            airline: al.name,
            airlineCode: al.code,
            flightNo: `${al.code}${200 + i * 13}`,
            sourceCity: src.city,
            sourceCode: src.code,
            destCity: dst.city,
            destCode: dst.code,
            departure: formatTime(depStr),
            arrival: formatTime(arrStr),
            duration: `${Math.floor(durMin / 60)}h ${durMin % 60}m`,
            stops: i % 3 === 0 ? 1 : 0,
            price: basePrice,
            currency: currency.toUpperCase(),
            priceFormatted: `${currency.toUpperCase()} ${basePrice.toLocaleString('en-IN')}`,
            isRefundable: i % 2 === 0,
            seatsLeft: 2 + (i % 8),
            score: 0.9 - i * 0.05,
            tags: i === 0 ? ['cheapest'] : (i === 1 ? ['best'] : []),
            isMock: true,
        };
    });
}

/**
 * GET /api/flights/search
 * Uses Amadeus for Developers sandbox API.
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

        const cacheKey = `${srcUpper}-${dstUpper}-${flightDate}-${adults}-${cabinClass}-${tripType}-${returnDate || ''}`;
        const cached = flightCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[FlightCache] HIT: ${cacheKey}`);
            return res.json(cached.data);
        }

        let results: any[] = [];
        let isMock = false;

        try {
            const token = await getAmadeusToken();

            const params: Record<string, string> = {
                originLocationCode: srcUpper,
                destinationLocationCode: dstUpper,
                departureDate: flightDate,
                adults,
                travelClass: CABIN_MAP[cabinClass.toLowerCase()] || 'ECONOMY',
                currencyCode: currency.toUpperCase(),
                max: '20',
                nonStop: directOnly === 'true' ? 'true' : 'false',
            };
            if (isRoundTrip) params.returnDate = returnDate!;

            const amRes = await axios.get(`${AMADEUS_BASE}/v2/shopping/flight-offers`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
                timeout: 20000,
            });

            const offers: any[] = amRes.data?.data || [];

            results = offers.map((offer: any) => {
                const price = parseFloat(offer.price?.grandTotal || offer.price?.total || '0');
                const itinerary = offer.itineraries?.[0];
                const segments: any[] = itinerary?.segments || [];
                const firstSeg = segments[0];
                const lastSeg = segments[segments.length - 1];

                const alCode = firstSeg?.carrierCode || '';
                const alName = AIRLINE_NAMES[alCode] || offer.validatingAirlineCodes?.[0] || alCode;

                const srcMeta = AIRPORT_META[srcUpper];
                const dstMeta = AIRPORT_META[dstUpper];

                return {
                    id: offer.id,
                    airline: alName,
                    airlineCode: alCode,
                    flightNo: `${alCode}${firstSeg?.number || '—'}`,
                    sourceCity: srcMeta?.city || firstSeg?.departure?.iataCode || srcUpper,
                    sourceCode: firstSeg?.departure?.iataCode || srcUpper,
                    destCity: dstMeta?.city || lastSeg?.arrival?.iataCode || dstUpper,
                    destCode: lastSeg?.arrival?.iataCode || dstUpper,
                    departure: formatTime(firstSeg?.departure?.at),
                    arrival: formatTime(lastSeg?.arrival?.at),
                    duration: durationToStr(itinerary?.duration || ''),
                    durationMinutes: durationToMinutes(itinerary?.duration || ''),
                    stops: segments.length - 1,
                    price: Math.round(price),
                    currency: currency.toUpperCase(),
                    priceFormatted: `${currency.toUpperCase()} ${Math.round(price).toLocaleString('en-IN')}`,
                    isRefundable: offer.pricingOptions?.includedCheckedBagsOnly ?? false,
                    seatsLeft: offer.numberOfBookableSeats ?? '—',
                    score: 0.9,
                    tags: [],
                    isMock: false,
                };
            });

            // Sort
            if (sortBy === 'price') results.sort((a, b) => a.price - b.price);
            else if (sortBy === 'fastest') results.sort((a, b) => (a.durationMinutes || 999) - (b.durationMinutes || 999));

            if (results.length === 0) {
                console.warn('[FlightSearch] Amadeus returned 0 results, using mock.');
                results = generateMockFlights(srcUpper, dstUpper, flightDate, currency);
                isMock = true;
            }
        } catch (apiErr: any) {
            const detail = apiErr.response?.data?.errors?.[0]?.detail || apiErr.message;
            console.error('[FlightSearch] Amadeus error:', detail);
            results = generateMockFlights(srcUpper, dstUpper, flightDate, currency);
            isMock = true;
        }

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
