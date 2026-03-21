import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

const RAILRADAR_API_KEY = 'rr_l5kw3cdiu6tmfmg2mnq6zlbuoo9ff4pw';
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';

const formatTime = (minutes: number) => {
    const min = minutes % 60;
    let h = Math.floor(minutes / 60);
    if (h >= 24) h %= 24;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};

const formatTravelTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};

// SIMPLE IN-MEMORY CACHE for Train Search
const trainCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

import { NEARBY_STATIONS, getTicketPrice } from '../utils/pricing';
import { prisma } from '../prisma';

router.get('/getTrainOn', async (req: Request, res: Response) => {
    try {
        const { from, to, date, class: reqClass } = req.query;

        if (!from || !to || !date) {
            return res.status(400).json({ success: false, data: "Missing query parameters" });
        }

        const cacheKey = `${from}-${to}-${date}-${reqClass || 'ALL'}`;
        const cached = trainCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[TrainCache] HIT for ${cacheKey}`);
            return res.json({ success: true, data: cached.data });
        }

        // Fetch common pricing data once
        const [corridors, customPrices] = await Promise.all([
            prisma.corridorPricing.findMany(),
            prisma.priceRequest.findMany({ where: { status: 'UPDATED' } })
        ]);

        const dateParts = (date as string).split('-');
        const journeyDate = new Date(
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month index
            parseInt(dateParts[0])  // Day
        );
        const dayFullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayFullName = dayFullNames[journeyDate.getDay()];

        console.log(`[TrainSearch] ${from} to ${to} on ${date} [Day: ${dayFullName}]`);

        // Helper to fetch from API
        const fetchRemote = async (src: string, dst: string, isFallback = false) => {
            const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/between?from=${src}&to=${dst}&date=${date}`, {
                headers: { 'X-Api-Key': RAILRADAR_API_KEY, 'Accept': 'application/json' }
            });
            const externalTrains = response.data?.data?.trains || [];
            return externalTrains.map((t: any) => ({ ...t, isAlternative: isFallback }));
        };

        // 1. Primary Direct Search
        let allRemoteTrains = await fetchRemote(from as string, to as string, false);

        // 2. Proximity Search if needed (mirroring client-side logic)
        const sourceAlts = [from as string, ...(NEARBY_STATIONS[from as string] || [])];
        const destAlts = [to as string, ...(NEARBY_STATIONS[to as string] || [])];

        if (allRemoteTrains.length === 0) {
            console.log(`[TrainSearch] No direct trains for ${from}->${to}. Expanding to proximity stations...`);
            const fallbackPromises = [];
            for (const s of sourceAlts) {
                for (const d of destAlts) {
                    if (s === from && d === to) continue;
                    fallbackPromises.push(fetchRemote(s, d, true));
                }
            }
            const results = await Promise.all(fallbackPromises);
            allRemoteTrains = results.flat();
        }

        const adaptedTrains = allRemoteTrains
            .filter((t: any) => {
                const rd = t.runningDays;
                if (!rd || rd.allDays === true) return true;
                return (rd.days || []).includes(dayFullName);
            })
            .map((t: any) => {
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                let running_days: Record<string, boolean> | null = {};
                dayKeys.forEach((key, i) => {
                    running_days![key] = t.runningDays?.allDays === true || (t.runningDays?.days || []).includes(dayNames[i]);
                });

                let available_classes: string[] = [];
                const classesSource = t.classes || t.availableClasses || t.train_class_details || [];
                if (Array.isArray(classesSource)) {
                    available_classes = classesSource.map((c: any) =>
                        (typeof c === 'string' ? c : (c.code || c.classCode || c.class_cd || '')).toUpperCase()
                    ).filter(Boolean);
                }

                // INJECT PRICING — Correctly calculate segment travel time
                // Use arrivalMinutes - departureMinutes to get the actual trip duration
                const depMins = t.fromStationSchedule?.departureMinutes || 0;
                const arrMins = t.toStationSchedule?.arrivalMinutes || 0;
                let segmentMins = arrMins - depMins;
                
                // Fallback to t.travelTimeMinutes if segment calculation is impossible/zero
                if (segmentMins <= 0) segmentMins = t.travelTimeMinutes || 0;

                const travelTimeStr = formatTravelTime(segmentMins);
                const prices: Record<string, number> = {};
                ['SL', '3A', '2A', 'CC'].forEach(cls => {
                    prices[cls] = getTicketPrice(
                        from as string, 
                        to as string, 
                        cls, 
                        t.trainName, 
                        travelTimeStr, 
                        corridors, 
                        customPrices
                    );
                });

                return {
                    isAlternative: t.isAlternative,
                    train_base: {
                        train_no: t.trainNumber,
                        train_name: t.trainName,
                        train_type: t.type,
                        from_stn_name: t.sourceStationName,
                        to_stn_name: t.destinationStationName,
                        from_time: formatTime(depMins),
                        to_time: formatTime(arrMins),
                        travel_time: travelTimeStr,
                        running_days,
                        available_classes,
                        prices // New field for frontend to consume
                    }
                };
            });

        // Deduplicate
        const uniqueTrains = Array.from(new Map(adaptedTrains.map((t: any) => [t.train_base.train_no, t])).values());

        console.log(`[TrainSearch] Returning ${uniqueTrains.length} unique trains`);
        trainCache.set(cacheKey, { data: uniqueTrains, expiry: Date.now() + CACHE_TTL });
        return res.json({ success: true, data: uniqueTrains });

    } catch (error: any) {
        console.error('Train Search Error:', error.response?.data || error.message);
        return res.json({ success: false, data: "Failed to fetch trains." });
    }
});

router.get('/schedule/:trainNo', async (req: Request, res: Response) => {
    try {
        const { trainNo } = req.params;

        const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/${trainNo}/schedule`, {
            headers: {
                'X-Api-Key': RAILRADAR_API_KEY,
                'Accept': 'application/json'
            }
        });

        const scheduleData = response.data?.data?.route || [];

        const adaptedSchedule = scheduleData.map((stop: any) => ({
            stationCode: stop.stationCode,
            stationName: stop.stationName,
            arrivalTime: stop.arrivalMinutes ? formatTime(stop.arrivalMinutes) : '--:--',
            departureTime: stop.departureMinutes ? formatTime(stop.departureMinutes) : '--:--',
            distance: stop.distanceFromSourceKm,
            day: stop.day,
            isHalt: stop.isHalt
        }));

        return res.json({ success: true, data: adaptedSchedule });

    } catch (error: any) {
        console.error('RailRadar Schedule Error:', error.response?.data || error.message);
        return res.json({
            success: false,
            data: error.response?.data?.error?.message || "Failed to fetch train schedule."
        });
    }
});

export default router;
