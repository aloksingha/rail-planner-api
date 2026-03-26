import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

import { getRailRadarKey } from '../utils/keys';
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
const scheduleCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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

        // Helper to fetch from API with automatic key failover
        const fetchRemote = async (src: string, dst: string, isFallback = false) => {
            const maxRetries = 3;
            let lastError: any = null;

            for (let i = 0; i < maxRetries; i++) {
                const key = getRailRadarKey();
                try {
                    const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/between?from=${src}&to=${dst}&date=${date}`, {
                        headers: { 'X-Api-Key': key, 'Accept': 'application/json' }
                    });
                    const externalTrains = response.data?.data?.trains || [];
                    return externalTrains.map((t: any) => ({ ...t, isAlternative: isFallback }));
                } catch (e: any) {
                    lastError = e;
                    const status = e.response?.status;
                    console.error(`[RailRadar] Key ${key.substring(0, 8)}... failed with status ${status}: ${e.message}`);
                    if (status === 401 || status === 403 || status === 429) {
                        console.log(`[RailRadar] Throttled or Invalid. Trying next key...`);
                        continue; // Try next key
                    }
                    throw e; // Critical error
                }
            }
            throw lastError || new Error('All API retries failed');
        };

        // 1. Primary Direct Search
        let allRemoteTrains = await fetchRemote(from as string, to as string, false);

        // 2. Proximity Search if needed (mirroring client-side logic)
        const sourceAlts = [from as string, ...(NEARBY_STATIONS[from as string] || [])];
        const destAlts = [to as string, ...(NEARBY_STATIONS[to as string] || [])];

        if (allRemoteTrains.length === 0) {
            console.log(`[TrainSearch] No direct trains for ${from}->${to}. Expanding to proximity stations...`);
            
            // Collect all pairs to search
            const pairs: {s: string, d: string}[] = [];
            for (const s of sourceAlts) {
                for (const d of destAlts) {
                    if (s === from && d === to) continue;
                    pairs.push({s, d});
                }
            }

            // Execute proximity searches sequentially or in small batches to avoid 429s
            console.log(`[TrainSearch] Executing ${pairs.length} proximity pairs...`);
            const fallbackResults = [];
            for (const pair of pairs) {
                try {
                    // Small delay to prevent bursting too many requests
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const results = await fetchRemote(pair.s, pair.d, true);
                    fallbackResults.push(...results);
                } catch (e) {
                    console.warn(`[TrainSearch] Proximity fail for ${pair.s}->${pair.d}: ${e.message}`);
                    // Continue to next pair instead of failing everything
                }
            }
            allRemoteTrains = fallbackResults;
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

                // INJECT PRICING — Correctly calculate cumulative segment travel time
                // The API provides minutes (0-1439) for each day. We MUST add (day - 1) * 1440.
                const depDay = t.fromStationSchedule?.day || 1;
                const arrDay = t.toStationSchedule?.day || depDay;
                
                const depMinsBase = t.fromStationSchedule?.departureMinutes || 0;
                const arrMinsBase = t.toStationSchedule?.arrivalMinutes || 0;
                
                const depMinsTotal = ((depDay - 1) * 1440) + depMinsBase;
                const arrMinsTotal = ((arrDay - 1) * 1440) + arrMinsBase;
                
                let segmentMins = arrMinsTotal - depMinsTotal;
                
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
                        train_type: t.type || t.train_type || t.trainType || 'EXPRESS',
                        from_stn_name: t.sourceStationName,
                        to_stn_name: t.destinationStationName,
                        from_time: formatTime(depMinsBase),
                        to_time: formatTime(arrMinsBase),
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

        const cached = scheduleCache.get(String(trainNo));
        if (cached && cached.expiry > Date.now()) {
            console.log(`[ScheduleCache] HIT for ${trainNo}`);
            return res.json({ success: true, data: cached.data });
        }

        const maxRetries = 3;
        let lastError: any = null;
        let scheduleData: any = [];

        for (let i = 0; i < maxRetries; i++) {
            const key = getRailRadarKey();
            try {
                const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/${trainNo}/schedule`, {
                    headers: { 'X-Api-Key': key, 'Accept': 'application/json' }
                });
                scheduleData = response.data?.data?.route || [];
                lastError = null;
                break; // Success!
            } catch (e: any) {
                lastError = e;
                if (e.response?.status === 429 || e.response?.status === 401 || e.response?.status === 403) {
                    continue; // Try next key
                }
                throw e; // Critical error
            }
        }

        if (lastError) throw lastError;

        const adaptedSchedule = scheduleData.map((stop: any) => ({
            stationCode: stop.stationCode,
            stationName: stop.stationName,
            arrivalTime: stop.arrivalMinutes ? formatTime(stop.arrivalMinutes) : '--:--',
            departureTime: stop.departureMinutes ? formatTime(stop.departureMinutes) : '--:--',
            distance: stop.distanceFromSourceKm,
            day: stop.day,
            isHalt: stop.isHalt
        }));

        scheduleCache.set(String(trainNo), { data: adaptedSchedule, expiry: Date.now() + (24 * 60 * 60 * 1000) }); // Cache schedules for 24 hours
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
