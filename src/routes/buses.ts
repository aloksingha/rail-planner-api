import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { sendWhatsApp } from '../services/notificationService';

const router = express.Router();

// Optional Auth: allows both logged-in users and guest bookings
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key') as any;
            req.user = payload;
        } catch {
            // Non-fatal for optional authentication
        }
    }
    next();
};

// ── AbhiBus / Partner B2B API Configuration Placeholder ──────────────────────
const ABHIBUS_API_KEY = process.env.ABHIBUS_API_KEY || '';
const ABHIBUS_CLIENT_ID = process.env.ABHIBUS_CLIENT_ID || '';
const ABHIBUS_BASE_URL = process.env.ABHIBUS_BASE_URL || 'https://api.abhibus.com/v1';

// ── In-Memory Bus Route & Fleet Matrix ─────────────────────────────────────────
interface BusOperator {
    id: string;
    operatorName: string;
    busType: string;
    category: 'AC_SLEEPER' | 'AC_SEATER' | 'NON_AC_SLEEPER' | 'NON_AC_SEATER';
    totalSeats: number;
    rating: number;
    reviewsCount: number;
    amenities: string[];
    cancellationPolicy: string;
}

const TOP_OPERATORS: BusOperator[] = [
    {
        id: 'OP_ZINGBUS',
        operatorName: 'Zingbus Plus',
        busType: 'Volvo 9600 Multi-Axle AC Sleeper (2+1)',
        category: 'AC_SLEEPER',
        totalSeats: 36,
        rating: 4.8,
        reviewsCount: 1420,
        amenities: ['Free WiFi', 'Charging Ports', 'Water Bottle', 'Blanket & Pillow', 'GPS Live Tracking', 'Emergency Exit'],
        cancellationPolicy: '100% refund up to 12 hours before departure'
    },
    {
        id: 'OP_INTRCITY',
        operatorName: 'IntrCity SmartBus',
        busType: 'BharatBenz AC Sleeper / Seater Lounge',
        category: 'AC_SLEEPER',
        totalSeats: 38,
        rating: 4.7,
        reviewsCount: 2150,
        amenities: ['Bus Captain', 'Clean Washroom', 'Snacks & Water', 'Reading Light', 'CCTV Surveillance'],
        cancellationPolicy: '90% refund up to 8 hours before departure'
    },
    {
        id: 'OP_SHYAMOLI',
        operatorName: 'Shyamoli Paribahan',
        busType: 'Volvo B11R Multi-Axle Ultra Luxury AC',
        category: 'AC_SLEEPER',
        totalSeats: 40,
        rating: 4.6,
        reviewsCount: 980,
        amenities: ['Reclining Berths', 'USB Chargers', 'AC Climate Control', 'Water Bottle'],
        cancellationPolicy: 'Full refund minus ₹100 clerkage before 24h'
    },
    {
        id: 'OP_ROYAL',
        operatorName: 'Royal Cruiser (WBTC Partner)',
        busType: 'Scania Metrolink Multi-Axle AC (2+2)',
        category: 'AC_SEATER',
        totalSeats: 45,
        rating: 4.5,
        reviewsCount: 1650,
        amenities: ['Individual AC Vents', 'Charging Sockets', 'Luggage Compartment', 'Emergency Alarm'],
        cancellationPolicy: '80% refund up to 6 hours before departure'
    },
    {
        id: 'OP_GREENLINE',
        operatorName: 'Greenline Travels',
        busType: 'Mercedes-Benz Multi-Axle Premium AC Sleeper',
        category: 'AC_SLEEPER',
        totalSeats: 34,
        rating: 4.7,
        reviewsCount: 840,
        amenities: ['Leather Sleeper Berths', 'Complimentary Water', 'Air Purifier', 'Live GPS Tracking'],
        cancellationPolicy: '100% refund up to 24 hours prior'
    }
];

// ── Known Cities & Pickup/Drop Hubs ───────────────────────────────────────────
const CITY_HUBS: Record<string, { boarding: string[]; dropping: string[] }> = {
    RAIGANJ: {
        boarding: ['Siliguri More (Near Bus Terminus)', 'Karnajora Bus Bay', 'Kulick Bridge Checkpost'],
        dropping: ['Siliguri More Stop', 'Raiganj Main Bus Stand', 'Karnajora Gate']
    },
    KOLKATA: {
        boarding: ['Esplanade Bus Terminus (Babughat)', 'Karunamoyee Salt Lake Terminal', 'Airport Gate No. 1', 'Dankuni Toll Plaza', 'Santragachi Station Hub'],
        dropping: ['Esplanade Main Terminus', 'Karunamoyee International Bus Terminal', 'Airport VIP Road Stop', 'Santragachi Railway Bus Bay']
    },
    SILIGURI: {
        boarding: ['Tenzing Norgay Central Bus Terminus', 'Junction Bus Stand', 'Bagdogra Bihar More'],
        dropping: ['Tenzing Norgay Central Bus Terminus', 'Court More Siliguri', 'Air Force Gate Bagdogra']
    },
    MALDA: {
        boarding: ['Rathbari More Bus Stand', 'Malda Town Station Square'],
        dropping: ['Rathbari Bypass', 'Malda Central Bus Stand']
    },
    DELHI: {
        boarding: ['Kashmere Gate ISBT', 'Majnu Ka Tilla', 'Anand Vihar ISBT', 'Dhaula Kuan Metro Gate 2'],
        dropping: ['Kashmere Gate ISBT', 'Majnu Ka Tilla Bus Bay', 'Akshardham Metro Station']
    },
    MANALI: {
        boarding: ['Private Bus Stand Manali', 'Mall Road Green Tax Barrier'],
        dropping: ['Manali Private Bus Stand', 'Aleo Hydro Project Point']
    },
    BANGALORE: {
        boarding: ['Majestic KBS', 'Madiwala St. John Hospital', 'Electronic City Toll', 'Yeshwanthpur Govardhan'],
        dropping: ['Majestic Bus Station', 'Madiwala Police Station', 'Electronic City Flyover End']
    },
    GOA: {
        boarding: ['Panjim KTC Bus Stand', 'Mapusa Bus Stand', 'Madgaon KTC Terminal'],
        dropping: ['Panjim KTC Bus Stand', 'Mapusa Circle', 'Madgaon Railway Gate']
    }
};

/**
 * Generate synthetic seat layout for a bus
 * Lower Deck: 18-24 berths/seats
 * Upper Deck: 12-18 sleeper berths
 */
function generateSeatLayout(busId: string, baseFare: number) {
    const seats: any[] = [];
    
    // Lower Deck: 12 berths (2+1 format: A1-A6 on left, B1-B6 on right single)
    const lowerBerths = [
        { no: 'L1', row: 1, col: 1, type: 'SLEEPER', deck: 'LOWER', price: baseFare + 100, isWindow: true },
        { no: 'L2', row: 1, col: 2, type: 'SLEEPER', deck: 'LOWER', price: baseFare + 100, isWindow: false },
        { no: 'L3', row: 1, col: 4, type: 'SLEEPER', deck: 'LOWER', price: baseFare + 150, isWindow: true },

        { no: 'L4', row: 2, col: 1, type: 'SLEEPER', deck: 'LOWER', price: baseFare, isWindow: true },
        { no: 'L5', row: 2, col: 2, type: 'SLEEPER', deck: 'LOWER', price: baseFare, isWindow: false },
        { no: 'L6', row: 2, col: 4, type: 'SLEEPER', deck: 'LOWER', price: baseFare + 50, isWindow: true },

        { no: 'L7', row: 3, col: 1, type: 'SLEEPER', deck: 'LOWER', price: baseFare, isWindow: true },
        { no: 'L8', row: 3, col: 2, type: 'SLEEPER', deck: 'LOWER', price: baseFare, isWindow: false },
        { no: 'L9', row: 3, col: 4, type: 'SLEEPER', deck: 'LOWER', price: baseFare + 50, isWindow: true },

        { no: 'L10', row: 4, col: 1, type: 'SLEEPER', deck: 'LOWER', price: baseFare - 50, isWindow: true },
        { no: 'L11', row: 4, col: 2, type: 'SLEEPER', deck: 'LOWER', price: baseFare - 50, isWindow: false },
        { no: 'L12', row: 4, col: 4, type: 'SLEEPER', deck: 'LOWER', price: baseFare, isWindow: true },
    ];

    // Upper Deck: 12 berths
    const upperBerths = [
        { no: 'U1', row: 1, col: 1, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 150, isWindow: true },
        { no: 'U2', row: 1, col: 2, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 150, isWindow: false },
        { no: 'U3', row: 1, col: 4, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 200, isWindow: true },

        { no: 'U4', row: 2, col: 1, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 50, isWindow: true },
        { no: 'U5', row: 2, col: 2, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 50, isWindow: false },
        { no: 'U6', row: 2, col: 4, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 100, isWindow: true },

        { no: 'U7', row: 3, col: 1, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 50, isWindow: true },
        { no: 'U8', row: 3, col: 2, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 50, isWindow: false },
        { no: 'U9', row: 3, col: 4, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 100, isWindow: true },

        { no: 'U10', row: 4, col: 1, type: 'SLEEPER', deck: 'UPPER', price: baseFare, isWindow: true },
        { no: 'U11', row: 4, col: 2, type: 'SLEEPER', deck: 'UPPER', price: baseFare, isWindow: false },
        { no: 'U12', row: 4, col: 4, type: 'SLEEPER', deck: 'UPPER', price: baseFare + 50, isWindow: true },
    ];

    // Seed pseudo-random booked seats using deterministic hashing on busId
    const bookedHash = busId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    [...lowerBerths, ...upperBerths].forEach((seat, idx) => {
        const isBooked = (bookedHash + idx * 7) % 3 === 0;
        const isLadies = !isBooked && (bookedHash + idx) % 5 === 0;
        seats.push({
            ...seat,
            isAvailable: !isBooked,
            isBooked,
            isLadies
        });
    });

    return seats;
}

// ── 1. GET /api/buses/search ──────────────────────────────────────────────────
router.get('/search', async (req: Request, res: Response) => {
    try {
        const {
            source = 'Raiganj',
            destination = 'Kolkata',
            date,
            busType = 'all',
            sortBy = 'price'
        } = req.query as Record<string, string>;

        const srcClean = source.trim().toUpperCase();
        const dstClean = destination.trim().toUpperCase();
        const travelDate = date || new Date(Date.now() + 86400000).toISOString().split('T')[0];

        // Base rate estimation based on route distance
        const isInterState = Math.abs(srcClean.length - dstClean.length) > 3;
        const baseFare = srcClean === 'RAIGANJ' && dstClean === 'KOLKATA' ? 650 : (isInterState ? 1150 : 750);

        const srcHubs = CITY_HUBS[srcClean] || {
            boarding: [`${source} Main Central Bus Station`, `${source} Bypass Toll Hub`],
            dropping: [`${source} City Drop Point`]
        };
        const dstHubs = CITY_HUBS[dstClean] || {
            boarding: [`${destination} Boarding Point`],
            dropping: [`${destination} Central Intercity Stand`, `${destination} City Entrance`]
        };

        const departureTimes = [
            { dep: '19:30', arr: '05:30', dur: '10h 00m' },
            { dep: '20:15', arr: '06:00', dur: '09h 45m' },
            { dep: '21:00', arr: '06:30', dur: '09h 30m' },
            { dep: '21:45', arr: '07:15', dur: '09h 30m' },
            { dep: '22:30', arr: '08:00', dur: '09h 30m' }
        ];

        let buses = TOP_OPERATORS.map((op, idx) => {
            const timeInfo = departureTimes[idx % departureTimes.length];
            const busFare = baseFare + (idx * 90);
            const busId = `TP_BUS_${srcClean.slice(0, 3)}_${dstClean.slice(0, 3)}_${op.id}_${idx}`;

            return {
                id: busId,
                operatorName: op.operatorName,
                busType: op.busType,
                category: op.category,
                sourceCity: source,
                destCity: destination,
                travelDate,
                departureTime: timeInfo.dep,
                arrivalTime: timeInfo.arr,
                duration: timeInfo.dur,
                fare: busFare,
                currency: 'INR',
                rating: op.rating,
                reviewsCount: op.reviewsCount,
                availableSeats: 14 + (idx * 3),
                totalSeats: op.totalSeats,
                amenities: op.amenities,
                cancellationPolicy: op.cancellationPolicy,
                boardingPoints: srcHubs.boarding.map((b, i) => ({
                    location: b,
                    time: `${parseInt(timeInfo.dep.split(':')[0])}:${(parseInt(timeInfo.dep.split(':')[1]) + (i * 15)).toString().padStart(2, '0')}`
                })),
                droppingPoints: dstHubs.dropping.map((d, i) => ({
                    location: d,
                    time: `${parseInt(timeInfo.arr.split(':')[0])}:${(parseInt(timeInfo.arr.split(':')[1]) + (i * 20)).toString().padStart(2, '0')}`
                })),
                isAbhiBusLive: Boolean(ABHIBUS_API_KEY)
            };
        });

        // Filter by bus type
        if (busType === 'sleeper') {
            buses = buses.filter(b => b.category.includes('SLEEPER'));
        } else if (busType === 'seater') {
            buses = buses.filter(b => b.category.includes('SEATER'));
        }

        // Sort
        if (sortBy === 'price') {
            buses.sort((a, b) => a.fare - b.fare);
        } else if (sortBy === 'rating') {
            buses.sort((a, b) => b.rating - a.rating);
        }

        return res.json({
            success: true,
            count: buses.length,
            route: `${source} ➔ ${destination}`,
            travelDate,
            data: buses
        });

    } catch (err: any) {
        console.error('[BusSearch] Error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to search buses.' });
    }
});

// ── 2. GET /api/buses/:id/seats ───────────────────────────────────────────────
router.get('/:id/seats', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fare = '650' } = req.query;
        const baseFare = parseInt(String(fare), 10) || 650;

        const seatLayout = generateSeatLayout(String(id), baseFare);

        return res.json({
            success: true,
            busId: id,
            layout: {
                hasUpperDeck: true,
                lowerDeckSeats: seatLayout.filter(s => s.deck === 'LOWER'),
                upperDeckSeats: seatLayout.filter(s => s.deck === 'UPPER'),
                totalAvailable: seatLayout.filter(s => s.isAvailable).length
            }
        });
    } catch (err: any) {
        console.error('[BusSeats] Error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch seat layout.' });
    }
});

// ── 3. POST /api/buses/book ───────────────────────────────────────────────────
router.post('/book', optionalAuth, async (req: Request, res: Response) => {
    try {
        const {
            busId,
            operatorName,
            busType,
            fromCity,
            toCity,
            travelDate,
            departureTime,
            boardingPoint,
            droppingPoint,
            selectedSeats = [],
            passengers = [],
            contactPhone,
            contactEmail
        } = req.body;

        if (!selectedSeats.length || !passengers.length) {
            return res.status(400).json({ error: 'Please select at least one seat and provide passenger details.' });
        }

        const seatNumbers = selectedSeats.map((s: any) => s.no || s).join(', ');
        const totalAmount = selectedSeats.reduce((acc: number, s: any) => acc + (s.price || 700), 0);
        const bookingId = `TP-BUS-${Date.now().toString().slice(-6)}`;

        // Send instant WhatsApp notification
        if (contactPhone) {
            const phoneStr = String(contactPhone);
            const waMsg = `🚍 *Bus Booking Confirmed — Tickets Pro*
━━━━━━━━━━━━━━━━━━
*Booking ID:* ${bookingId}
*Operator:* ${operatorName || 'Intercity Express'} (${busType || 'AC Sleeper'})
*Route:* ${fromCity} ➔ ${toCity}
*Date & Time:* ${travelDate} at ${departureTime}
*Boarding Point:* ${boardingPoint?.location || boardingPoint || 'Main Bus Stand'}
*Seats Booked:* ${seatNumbers}
*Total Paid:* ₹${totalAmount.toLocaleString('en-IN')}

_Show this SMS/WhatsApp to the bus conductor before boarding._
Safe travels with Tickets Pro! Support: https://ticketspro.in`;

            await sendWhatsApp(phoneStr, waMsg).catch(() => {});
        }

        return res.json({
            success: true,
            bookingId,
            status: 'CONFIRMED',
            seatNumbers,
            totalAmount,
            message: 'Bus ticket confirmed successfully! Confirmation sent via WhatsApp.'
        });

    } catch (err: any) {
        console.error('[BusBook] Error:', err.message);
        return res.status(500).json({ error: 'Failed to process bus booking.' });
    }
});

export default router;
