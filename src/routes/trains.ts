import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

import { getRailRadarKey } from '../utils/keys';
const RAILRADAR_BASE_URL = 'https://api.railradar.in/v1';

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

const CACHE_TTL = 2 * 60 * 60; // 2 hours in seconds (instant repeat searches, quota defense)
const SEARCH_VERSION = 'v3.17-quota-optimizer'; // Invalidate old caches and enforce 1-search=1-credit policy

import { CacheService } from '../utils/cache';

import { PricingContext, getTicketPrice } from '../utils/pricing';
import { prisma } from '../prisma';

// In-memory memoization for pricing context (5 minutes TTL) to prevent 6 DB queries per search
let cachedPricingContext: PricingContext | null = null;
let pricingContextExpiry = 0;

export async function getCachedPricingContext(): Promise<PricingContext> {
    const now = Date.now();
    if (cachedPricingContext && now < pricingContextExpiry) {
        return cachedPricingContext;
    }

    const [corridors, customPrices, rules, specialCharges, mappings, nearbys] = await Promise.all([
        prisma.corridorPricing.findMany(),
        prisma.priceRequest.findMany({ where: { status: 'UPDATED' } }),
        prisma.pricingRule.findMany(),
        prisma.specialCharge.findMany(),
        prisma.stationMapping.findMany(),
        prisma.stationNearby.findMany()
    ]);

    cachedPricingContext = {
        corridors,
        customPrices,
        rules,
        specialCharges,
        mappings,
        nearbys
    };
    pricingContextExpiry = now + 5 * 60 * 1000;
    return cachedPricingContext;
}

export function invalidatePricingContextCache() {
    cachedPricingContext = null;
    pricingContextExpiry = 0;
}

// Circuit breaker for RailRadar API (skips redundant 429 delays when monthly quota is exhausted)
let railRadarThrottledUntil = 0;

export const isRailRadarAvailable = () => {
    return Date.now() > railRadarThrottledUntil;
};

export const tripRailRadarCircuitBreaker = (minutes = 30) => {
    railRadarThrottledUntil = Date.now() + minutes * 60 * 1000;
    console.warn(`[RailRadar] Circuit breaker tripped! Skipping RailRadar for ${minutes} minutes due to quota exhaustion.`);
};

router.get('/getTrainOn', async (req: Request, res: Response) => {
    try {
        const { from, to, date, class: reqClass } = req.query;

        if (!from || !to || !date) {
            return res.status(400).json({ success: false, data: "Missing query parameters" });
        }

        const cacheKey = `train_search:${from}-${to}-${date}-${reqClass || 'ALL'}-${SEARCH_VERSION}`;
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`[TrainCache] HIT for ${cacheKey}`);
            return res.json({ success: true, data: JSON.parse(cached) });
        }

        // Fast cached pricing context (0 DB queries on warm cache)
        const pricingContext = await getCachedPricingContext();
        const nearbys = pricingContext.nearbys;

        // ❌ Block "Intra-City" searches to prevent confusion
        const nearbyCodes = nearbys
            .filter(n => n.stationCode === from)
            .map(n => n.nearbyCode);
            
        const isSameCluster = from === to || nearbyCodes.includes(to as string);
        if (isSameCluster) {
            console.log(`[TrainSearch] BLOCKED: Intra-city search detected (${from} -> ${to})`);
            return res.json({ success: true, data: [] });
        }

        const dateParts = (date as string).split('-');
        const journeyDate = new Date(
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month index
            parseInt(dateParts[0])  // Day
        );
        const dayFullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayFullName = dayFullNames[journeyDate.getDay()];

        console.log(`[TrainSearch] ${from} to ${to} on ${date} [Day: ${dayFullName}]`);

        // Helper to fetch from API with dual-engine failover
        const fetchRemote = async (src: string, dst: string, isFallback = false) => {
            let lastError: any = null;

            if (isRailRadarAvailable()) {
                const maxRetries = 3;
                for (let i = 0; i < maxRetries; i++) {
                    const key = getRailRadarKey();
                    try {
                        console.log(`[SearchEngine] Trying RailRadar with key ${key.substring(0, 8)}...`);
                        // Convert DD-MM-YYYY to YYYY-MM-DD for the new RailRadar API
                        const apiDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/between/${src}/${dst}?date=${apiDate}`, {
                            headers: { 
                                'Authorization': `Bearer ${key}`,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'application/json, text/plain, */*',
                                'Accept-Language': 'en-US,en;q=0.9'
                            },
                            timeout: 5000
                        });
                        const externalTrains = response.data?.trains || response.data?.data?.trains || [];
                        console.log(`[SearchEngine] RailRadar ${isFallback ? 'Proximity' : 'Direct'} HIT for ${src}->${dst} (${externalTrains.length} trains)`);
                        return externalTrains.map((t: any) => {
                            const durHrs = Math.floor(t.duration / 60);
                            const durRem = t.duration % 60;
                            const srcMins = parseInt(t.from.departure.split(':')[0]) * 60 + parseInt(t.from.departure.split(':')[1]) + (t.from.day - 1) * 1440;
                            const dstMins = parseInt(t.to.arrival.split(':')[0]) * 60 + parseInt(t.to.arrival.split(':')[1]) + (t.to.day - 1) * 1440;
                            const dayMap: {[key: string]: string} = {
                                'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat', 'sun': 'Sun'
                            };

                            return {
                                train_name: t.train.name,
                                train_no: t.train.number,
                                from_stn_name: t.from.code,
                                to_stn_name: t.to.code,
                                from_time: t.from.departure,
                                to_time: t.to.arrival,
                                travel_time: `${durHrs.toString().padStart(2, '0')}:${durRem.toString().padStart(2, '0')}`,
                                from_std_mins: srcMins,
                                to_sta_mins: dstMins,
                                running_days: {
                                    days: (Array.isArray(t.train.runDays) ? t.train.runDays : (typeof t.train.runDays === 'string' ? t.train.runDays.split(',') : [])).map((d: string) => dayMap[d.trim().toLowerCase()] || d),
                                    allDays: (t.train.runDays || []).length === 7 || (typeof t.train.runDays === 'string' && t.train.runDays.toLowerCase() === 'daily')
                                },
                                isAlternative: isFallback
                            };
                        });
                    } catch (e: any) {
                        lastError = e;
                        const status = e.response?.status;
                        if (status === 429) {
                            console.warn(`[RailRadar] Key ${key.substring(0, 8)} quota exceeded (429). Tripping circuit breaker for 30 minutes.`);
                            tripRailRadarCircuitBreaker(30);
                            break; // Skip further keys immediately when monthly quota is exhausted
                        }
                        if (status === 401 || status === 403) {
                            console.log(`[RailRadar] Key ${key.substring(0, 8)} throttled/invalid (Status: ${status}). Body: ${typeof e.response?.data === 'string' ? e.response?.data.substring(0, 200) : 'JSON'}. Trying next...`);
                            continue; 
                        }
                        console.warn(`[RailRadar] Failed with status ${status}, breaking loop to try RailKit. Error: ${e.message}`);
                        break;
                    }
                }
            } else {
                console.log(`[SearchEngine] RailRadar circuit open (throttled). Skipping directly to Engine 2 (RailKit)...`);
            }
            

            // --- ENGINE 2: RAILKIT LIVE FALLBACK ---
            // If RailRadar is unavailable, throttled, or returns 0 trains, use RailKit.
            // RailKit results are cached in Redis for 6 hours (21600s) to protect API quota.
            const rkCacheKey = `rk_search:${src}-${dst}-${date}`;
            try {
                const rkCached = await CacheService.get(rkCacheKey);
                if (rkCached) {
                    console.log(`[SearchEngine] RailKit Cache HIT for ${src}->${dst} (0 API requests consumed)`);
                    return JSON.parse(rkCached);
                }
            } catch (cErr: any) {
                console.warn(`[SearchEngine] RailKit cache read failed: ${cErr.message}`);
            }

            try {
                const railkitKey = process.env.RAILKIT_API_KEY || 'railkit_cb0204e7cffc3b5cfaf811f6ca709344cae8f86899fd845a';
                if (railkitKey) {
                    let railkit: any;
                    try {
                        const importDynamic = new Function('m', 'return import(m)');
                        let mod: any;
                        try {
                            mod = await importDynamic('railkit');
                        } catch {
                            try {
                                mod = await importDynamic('railkit/index.obfuscated.js');
                            } catch {
                                const { pathToFileURL } = require('url');
                                const resolved = require.resolve('railkit');
                                mod = await importDynamic(pathToFileURL(resolved).href);
                            }
                        }
                        railkit = mod.railkit || mod.default || mod;
                    } catch (rkLoadErr: any) {
                        console.warn(`[SearchEngine] Could not load railkit: ${rkLoadErr.message}`);
                    }
                    if (typeof railkit?.configure === 'function') {
                        railkit.configure(railkitKey);
                    }
                    const searchMethod = railkit?.searchTrainBetweenStations || railkit?.findTrainsBetweenStations;
                    if (typeof searchMethod === 'function') {
                        console.log(`[SearchEngine] RailKit API Call: ${src}->${dst} on ${date} (isFallback=${isFallback})`);
                        const rkResponse = await searchMethod(src, dst, date as string);
                        const rkTrains = rkResponse?.data || (Array.isArray(rkResponse) ? rkResponse : []);
                        if (rkResponse?.success !== false && Array.isArray(rkTrains) && rkTrains.length > 0) {
                            console.log(`[SearchEngine] RailKit HIT for ${src}->${dst} (${rkTrains.length} trains)`);
                            const dayMapIndices = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                            const mappedTrains = rkTrains.filter((t: any) => t && (t.train_no || t.trainNumber)).map((t: any) => {
                                const depTimeStr = (t.from_time || t.departureTime || '00:00').substring(0, 5);
                                const arrTimeStr = (t.to_time || t.arrivalTime || '00:00').substring(0, 5);
                                const [depH, depM] = depTimeStr.split(':').map(Number);
                                const [arrH, arrM] = arrTimeStr.split(':').map(Number);
                                const srcMins = (depH || 0) * 60 + (depM || 0);

                                let durMins = 0;
                                if (t.travel_time) {
                                    const match = String(t.travel_time).match(/(\d+):(\d+)/);
                                    if (match) {
                                        durMins = parseInt(match[1]) * 60 + parseInt(match[2]);
                                    }
                                }
                                if (durMins <= 0) {
                                    let calcArrMins = (arrH || 0) * 60 + (arrM || 0);
                                    if (calcArrMins < srcMins) calcArrMins += 1440;
                                    durMins = calcArrMins - srcMins;
                                }
                                const durHrs = Math.floor(durMins / 60);
                                const durRem = durMins % 60;
                                const formattedTravelTime = `${durHrs.toString().padStart(2, '0')}:${durRem.toString().padStart(2, '0')}`;
                                const dstMins = srcMins + durMins;

                                let activeDays: string[] = [];
                                let allDays = false;
                                if (typeof t.running_days === 'string' && /^[01]{7}$/.test(t.running_days)) {
                                    allDays = t.running_days === '1111111';
                                    for (let d = 0; d < 7; d++) {
                                        if (t.running_days[d] === '1') {
                                            activeDays.push(dayMapIndices[d]);
                                        }
                                    }
                                } else if (Array.isArray(t.running_days)) {
                                    activeDays = t.running_days;
                                    allDays = activeDays.length === 7;
                                } else if (typeof t.running_days === 'string' && t.running_days.toLowerCase() === 'daily') {
                                    allDays = true;
                                    activeDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                } else if (Array.isArray(t.runDays)) {
                                    activeDays = t.runDays;
                                    allDays = activeDays.length === 7;
                                } else {
                                    allDays = true;
                                    activeDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                }

                                // Extract actual IRCTC classes from RailKit
                                let classList: string[] = [];
                                if (typeof t.classes_of_travel === 'string') {
                                    classList = t.classes_of_travel.split(',').map((c: string) => c.trim().toUpperCase());
                                } else if (Array.isArray(t.classes)) {
                                    classList = t.classes.map((c: any) => (typeof c === 'string' ? c : (c.code || c.classCode || '')).trim().toUpperCase());
                                } else if (Array.isArray(t.availableClasses)) {
                                    classList = t.availableClasses.map((c: any) => (typeof c === 'string' ? c : (c.code || c.classCode || '')).trim().toUpperCase());
                                } else if (Array.isArray(t.train_class_details)) {
                                    classList = t.train_class_details.map((c: any) => (typeof c === 'string' ? c : (c.code || c.classCode || '')).trim().toUpperCase());
                                }

                                const VALID_CLASSES = ['SL', '3E', '3A', '2A', 'CC', '1A', '2S', 'FC', 'EV', 'EC'];
                                classList = classList.filter(c => VALID_CLASSES.includes(c));

                                const tNameUpper = String(t.train_name || t.trainName || '').toUpperCase();
                                const isAC = tNameUpper.includes(' AC ') || tNameUpper.includes('AC ') || tNameUpper.endsWith(' AC') || tNameUpper.includes('RAJDHANI') || tNameUpper.includes('TEJAS');

                                if (isAC) {
                                    classList = classList.filter(c => c !== 'SL' && c !== '2S');
                                }

                                if (classList.length === 0) {
                                    classList = isAC ? ['3A', '2A', '1A'] : ['SL', '3A', '2A', '1A'];
                                }

                                return {
                                    train_name: t.train_name || t.trainName || ('Train ' + (t.train_no || t.trainNumber)),
                                    train_no: String(t.train_no || t.trainNumber),
                                    from_stn_code: t.from_stn_code || src,
                                    from_stn_name: t.from_stn_name || t.from_stn_code || src,
                                    to_stn_code: t.to_stn_code || dst,
                                    to_stn_name: t.to_stn_name || t.to_stn_code || dst,
                                    from_time: depTimeStr,
                                    to_time: arrTimeStr,
                                    travel_time: formattedTravelTime,
                                    from_std_mins: srcMins,
                                    to_sta_mins: dstMins,
                                    running_days: {
                                        days: activeDays,
                                        allDays
                                    },
                                    runningDays: {
                                        days: activeDays,
                                        allDays
                                    },
                                    train_class_details: classList.map((c: any) => typeof c === 'string' ? { classCode: c } : c),
                                    classes: classList,
                                    classes_of_travel: t.classes_of_travel,
                                    isAlternative: isFallback
                                };
                            });

                            // Cache RailKit results in Redis for 6 hours (21600 seconds)
                            try {
                                await CacheService.set(rkCacheKey, JSON.stringify(mappedTrains), 6 * 3600);
                            } catch (scErr: any) {
                                console.warn(`[SearchEngine] RailKit cache write error: ${scErr.message}`);
                            }

                            return mappedTrains;
                        } else {
                            console.log(`[SearchEngine] RailKit returned 0 trains for ${src}->${dst}`);
                        }
                    }
                }
            } catch (rkErr: any) {
                console.warn(`[SearchEngine] RailKit search failed: ${rkErr.message}. Falling back to Engine 3 (Offline)...`);
            }

            // --- ENGINE 3: OFFLINE TRAINS FALLBACK ---
            try {
                const fs = require('fs');
                const path = require('path');
                const localPath = path.join(process.cwd(), 'src/data/offline_trains.json');
                if (fs.existsSync(localPath)) {
                    const offlineData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
                    const matchedTrains = offlineData.filter((t: any) => 
                        t.stops.includes(src) && t.stops.includes(dst) && 
                        t.stops.indexOf(src) < t.stops.indexOf(dst)
                    );
                    
                    if (matchedTrains.length > 0) {
                        return matchedTrains.map((t: any) => {
                            const srcTime = t.times[src];
                            const dstTime = t.times[dst];
                            
                            const parseToMins = (timeStr: string) => {
                                const [h, m] = timeStr.split(':').map(Number);
                                return h * 60 + m;
                            };
                            const srcMins = parseToMins(srcTime.dep) + (srcTime.day - 1) * 1440;
                            const dstMins = parseToMins(dstTime.arr) + (dstTime.day - 1) * 1440;
                            const durMins = dstMins - srcMins;
                            const durHrs = Math.floor(durMins / 60);
                            const durRem = durMins % 60;
                            
                            return {
                                train_name: t.train_name,
                                train_no: t.train_no,
                                from_stn_name: src,
                                to_stn_name: dst,
                                from_time: srcTime.dep,
                                to_time: dstTime.arr,
                                travel_time: `${durHrs.toString().padStart(2, '0')}:${durRem.toString().padStart(2, '0')}`,
                                from_std_mins: srcMins,
                                to_sta_mins: dstMins,
                                running_days: {
                                    days: t.run_days,
                                    allDays: t.run_days.length === 7
                                },
                                train_class_details: t.classes.map((c: string) => ({ classCode: c })),
                                isAlternative: isFallback
                            };
                        });
                    }
                }
            } catch (e: any) {
                console.error(`[SearchEngine] Offline Fallback Error: ${e.message}`);
            }

            // If even offline fails or no trains found, return empty array instead of crashing
            return [];
        };

        // 1. Primary Direct Search
        let allRemoteTrains = await fetchRemote(from as string, to as string, false);

        // 2. Proximity Terminal Expansion (Metro Cluster Expansion)
        // Check key terminal alternatives for source and destination clusters
        const sourceNearbys = nearbys.filter(n => n.stationCode === from).map(n => n.nearbyCode);
        const destNearbys = nearbys.filter(n => n.stationCode === to).map(n => n.nearbyCode);

        // Prioritize critical terminals (e.g. DKAE, SDAH, KOAA, SHM for Kolkata; SMVB, YPR for Bangalore)
        const priorityTerminals = ['DKAE', 'SDAH', 'KOAA', 'SHM', 'SRC', 'SMVB', 'YPR', 'KJM', 'NDLS', 'DLI', 'NZM', 'ANVT', 'CSMT', 'BDTS', 'LTT', 'MMCT'];
        const sortTerminals = (list: string[]) => {
            return [...list].sort((a, b) => {
                const aIdx = priorityTerminals.indexOf(a);
                const bIdx = priorityTerminals.indexOf(b);
                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                if (aIdx !== -1) return -1;
                if (bIdx !== -1) return 1;
                return 0;
            });
        };

        const sortedDestNearbys = sortTerminals(destNearbys);
        const sortedSourceNearbys = sortTerminals(sourceNearbys);

        const proximityPairs: { s: string, d: string }[] = [];

        // Add destination alternatives (e.g. SBC -> DKAE, SBC -> SDAH)
        for (const altDest of sortedDestNearbys) {
            if (altDest !== to && !proximityPairs.some(p => p.s === from && p.d === altDest)) {
                proximityPairs.push({ s: from as string, d: altDest });
            }
        }

        // Add source alternatives (e.g. SMVB -> HWH, YPR -> HWH)
        for (const altSrc of sortedSourceNearbys) {
            if (altSrc !== from && !proximityPairs.some(p => p.s === altSrc && p.d === to)) {
                proximityPairs.push({ s: altSrc, d: to as string });
            }
        }

        // Add cross-terminal pairs (e.g. SMVB -> DKAE)
        for (const altSrc of sortedSourceNearbys.slice(0, 2)) {
            for (const altDest of sortedDestNearbys.slice(0, 3)) {
                if (!proximityPairs.some(p => p.s === altSrc && p.d === altDest)) {
                    proximityPairs.push({ s: altSrc, d: altDest });
                }
            }
        }

        const topProximityPairs = proximityPairs.slice(0, 8);
        console.log(`[TrainSearch] Checking ${topProximityPairs.length} proximity pairs for ${from}->${to}:`, topProximityPairs.map(p => `${p.s}->${p.d}`).join(', '));

        const fallbackResults: any[] = [];
        if (topProximityPairs.length > 0) {
            const proximityResults = await Promise.allSettled(
                topProximityPairs.map(pair => fetchRemote(pair.s, pair.d, true))
            );
            proximityResults.forEach((res) => {
                if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                    fallbackResults.push(...res.value);
                }
            });
        }

        // Combine nearby and direct results (Priority: Direct > Closest Nearby > Furthest Nearby)
        allRemoteTrains = [...allRemoteTrains, ...fallbackResults];

        const shiftDay = (dayName: string, shift: number): string => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const idx = days.indexOf(dayName);
            if (idx === -1) return dayName;
            const newIdx = (idx + shift) % 7;
            const finalIdx = newIdx >= 0 ? newIdx : newIdx + 7;
            return days[finalIdx];
        };

        const adaptedTrains = allRemoteTrains
            .filter((t: any) => {
                const depDay = t.fromStationSchedule?.day ?? 1;
                
                // To depart search station on journeyDate, train must start from origin at journeyDate - (depDay - 1) days
                const originDate = new Date(journeyDate);
                originDate.setDate(originDate.getDate() - (depDay - 1));
                const originDayFullName = dayFullNames[originDate.getDay()];

                const rd = t.runningDays || t.running_days;
                if (!rd || rd.allDays === true) return true;
                
                const daysList = rd.days || [];
                return daysList.includes(originDayFullName);
            })
            .map((t: any) => {
                const depDay = t.fromStationSchedule?.day ?? 1;
                const arrDay = t.toStationSchedule?.day ?? depDay;

                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                
                const indexToDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                let running_days: Record<string, boolean> = {};
                dayKeys.forEach((key, i) => {
                    const targetDayAtSearchStation = dayNames[i];
                    
                    const targetDayIdx = indexToDay.indexOf(targetDayAtSearchStation);
                    const originDayIdx = (targetDayIdx - (depDay - 1) + 70) % 7;
                    const originDayName = indexToDay[originDayIdx];
                    
                    const isRunning = t.runningDays?.allDays === true || 
                                     (t.runningDays?.days || []).includes(originDayName) ||
                                     (t.running_days?.days || []).includes(originDayName);
                    running_days[key] = isRunning;
                });

                let available_classes: string[] = [];
                const classesSource = t.classes_of_travel || t.classes || t.availableClasses || t.train_class_details || [];
                if (typeof classesSource === 'string') {
                    available_classes = classesSource.split(',').map((c: string) => c.trim().toUpperCase());
                } else if (Array.isArray(classesSource)) {
                    available_classes = classesSource.map((c: any) =>
                        (typeof c === 'string' ? c : (c.code || c.classCode || c.class_cd || '')).toUpperCase()
                    ).filter(Boolean);
                }

                const VALID_CLASSES = ['SL', '3E', '3A', '2A', 'CC', '1A', '2S', 'FC', 'EV', 'EC'];
                available_classes = available_classes.filter((c: string) => VALID_CLASSES.includes(c));

                const tNameUpper = String(t.trainName || t.train_name || '').toUpperCase();
                const isTrainAC = tNameUpper.includes(' AC ') || tNameUpper.includes('AC ') || tNameUpper.endsWith(' AC') || tNameUpper.includes('RAJDHANI') || tNameUpper.includes('TEJAS');

                if (isTrainAC) {
                    available_classes = available_classes.filter((c: string) => c !== 'SL' && c !== '2S');
                }

                if (available_classes.length === 0) {
                    available_classes = isTrainAC ? ['3A', '2A', '1A'] : ['SL', '3A', '2A', '1A'];
                }

                // Train schedule & departure calculation
                const depMinsBase = t.fromStationSchedule?.departureMinutes ?? t.from_std_mins ?? 0;
                const arrMinsBase = t.toStationSchedule?.arrivalMinutes ?? t.to_sta_mins ?? 0;
                
                const depMinsTotal = t.fromStationSchedule ? (((depDay - 1) * 1440) + depMinsBase) : (t.from_std_mins ?? 0);
                const arrMinsTotal = t.toStationSchedule ? (((arrDay - 1) * 1440) + arrMinsBase) : (t.to_sta_mins ?? 0);
                let segmentMins = arrMinsTotal - depMinsTotal;
                if (segmentMins <= 0) segmentMins = t.travelTimeMinutes || 0;

                const travelTimeStr = formatTravelTime(segmentMins);
                
                // Calculate calendar departure and arrival dates
                const depDateObj = new Date(journeyDate);
                const arrDateObj = new Date(journeyDate);
                
                // Fix: Calculate exact day diff using total minutes from origin
                const addedDays = Math.floor(arrMinsTotal / 1440) - Math.floor(depMinsTotal / 1440);
                arrDateObj.setDate(arrDateObj.getDate() + addedDays);

                const formatDate = (d: Date) => {
                    const day = d.getDate().toString().padStart(2, '0');
                    const month = (d.getMonth() + 1).toString().padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}-${month}-${year}`;
                };

                const formatDateFriendly = (d: Date) => {
                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}`;
                };

                const departure_date = formatDate(depDateObj);
                const arrival_date = formatDate(arrDateObj);
                const departure_date_friendly = formatDateFriendly(depDateObj);
                const arrival_date_friendly = formatDateFriendly(arrDateObj);

                const prices: Record<string, number> = {};
                ['SL', '3A', '2A', 'CC', '3E', '1A', '2S', 'FC', 'EV', 'EC'].forEach(cls => {
                    prices[cls] = getTicketPrice(
                        from as string, 
                        to as string, 
                        cls, 
                        t.trainName || t.train_name, 
                        travelTimeStr, 
                        pricingContext
                    );
                });

                // FIX PRICING ERRORS: Enforce logical hierarchy
                if (prices['SL'] && prices['3A'] && prices['SL'] >= prices['3A']) prices['3A'] = prices['SL'] + 800;
                if (prices['3A'] && prices['2A'] && prices['3A'] >= prices['2A']) prices['2A'] = prices['3A'] + 1000;
                if (prices['2A'] && prices['1A'] && prices['2A'] >= prices['1A']) prices['1A'] = prices['2A'] + 1500;
                if (prices['CC'] && prices['EC'] && prices['CC'] >= prices['EC']) prices['EC'] = prices['CC'] + 1000;
                if (prices['EC'] && prices['EV'] && prices['EC'] >= prices['EV']) prices['EV'] = prices['EC'] + 500;

                return {
                    isAlternative: t.isAlternative,
                    train_base: {
                        train_no: t.trainNumber || t.train_no,
                        train_name: t.trainName || t.train_name,
                        train_type: t.type || t.train_type || 'EXPRESS',
                        from_stn_code: t.sourceStationCode || t.from_stn_name || from,
                        to_stn_code: t.destinationStationCode || t.to_stn_name || to,
                        from_stn_name: t.sourceStationName || t.from_stn_name,
                        to_stn_name: t.destinationStationName || t.to_stn_name,
                        from_time: formatTime(depMinsBase),
                        to_time: formatTime(arrMinsBase),
                        travel_time: travelTimeStr,
                        running_days,
                        available_classes,
                        prices,
                        departure_date,
                        arrival_date,
                        departure_date_friendly,
                        arrival_date_friendly
                    }
                };
            });

        // Filter out Passenger and 2S-only trains
        const filteredTrains = adaptedTrains.filter((t: any) => {
            const tName = String(t.train_base.train_name).toUpperCase();
            const tType = String(t.train_base.train_type).toUpperCase();
            const tNo = String(t.train_base.train_no).trim();
            
            // Indian Railway regional passenger, local, MEMU, and DEMU train number checks
            const isPassengerNo = /^[567]\d{4}$/.test(tNo);

            // 1. Filter out Passenger, DEMU, MEMU, and Local trains
            if (
                tType === 'PASSENGER' || tType.includes('PASS') || tType.includes('DEMU') || tType.includes('MEMU') || tType.includes('LOCAL') ||
                tName.includes('PASSENGER') || tName.includes('PASSGR') || tName.includes('DEMU') || tName.includes('MEMU') || tName.includes('LOCAL') ||
                isPassengerNo
            ) {
                console.log(`[TrainSearch] Filtering out Passenger train: ${t.train_base.train_name} (${t.train_base.train_no})`);
                return false;
            }

            // 2. Filter out trains that only carry 2S class (or no classes, which falls back to passenger types)
            const avCls = t.train_base.available_classes || [];
            const filteredCls = ['SL', '3A', '2A', 'CC', '3E', '1A', '2S', 'FC', 'EV', 'EC'].filter((c: string) => avCls.includes(c));

            // If the train has classes but it's only 2S
            if (filteredCls.length === 1 && filteredCls[0] === '2S') {
                console.log(`[TrainSearch] Filtering out 2S-only train: ${t.train_base.train_name} (${t.train_base.train_no})`);
                return false;
            }

            return true;
        });

        // Deduplicate: Keep the first occurrence (highest priority)
        const uniqueTrainsMap = new Map();
        for (const t of filteredTrains) {
            const no = t.train_base.train_no;
            if (!uniqueTrainsMap.has(no)) {
                uniqueTrainsMap.set(no, t);
            }
        }
        const uniqueTrains = Array.from(uniqueTrainsMap.values());

        console.log(`[TrainSearch] Returning ${uniqueTrains.length} unique trains`);
        if (uniqueTrains.length > 0) {
            await CacheService.set(cacheKey, JSON.stringify(uniqueTrains), CACHE_TTL);
        } else {
            // Cache empty result for 5 minutes to prevent rapid click spamming
            await CacheService.set(cacheKey, JSON.stringify([]), 300);
        }
        return res.json({ 
            success: true, 
            data: uniqueTrains, 
            provider: 'RailRadar API (Live IRCTC)' 
        });

    } catch (error: any) {
        console.error('Train Search Error:', error.response?.data || error.message);
        return res.json({ success: false, data: "Failed to fetch trains." });
    }
});

router.get('/schedule/:trainNo', async (req: Request, res: Response) => {
    try {
        const { trainNo } = req.params;

        const cacheKey = `schedule:${trainNo}`;
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            console.log(`[ScheduleCache] HIT for ${trainNo}`);
            return res.json({ success: true, data: JSON.parse(cached) });
        }

        const maxRetries = 3;
        let lastError: any = null;
        let scheduleData: any = [];

        for (let i = 0; i < maxRetries; i++) {
            const key = getRailRadarKey();
            try {
                // The correct endpoint in RailRadar for a train's details and route is /trains/:trainNo
                const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/${trainNo}`, {
                    headers: { 
                        'Authorization': `Bearer ${key}`, 
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'en-US,en;q=0.9'
                    },
                    timeout: 8000
                });
                
                // The schedule is returned inside data.route
                scheduleData = response.data?.data?.route || [];
                lastError = null;
                break; // Success!
            } catch (e: any) {
                lastError = e;
                if (e.response?.status === 429 || e.response?.status === 401 || e.response?.status === 403) {
                    continue; // Try next key
                }
                break; // Stop and try fallback
            }
        }

        // RailKit Live Fallback for Schedule
        if (scheduleData.length === 0) {
            try {
                const railkitKey = process.env.RAILKIT_API_KEY || 'railkit_cb0204e7cffc3b5cfaf811f6ca709344cae8f86899fd845a';
                if (railkitKey) {
                    let railkit: any;
                    try {
                        const importDynamic = new Function('m', 'return import(m)');
                        const mod = await importDynamic('railkit');
                        railkit = mod.default || mod;
                    } catch {
                        railkit = require('railkit');
                    }
                    if (typeof railkit?.configure === 'function') {
                        railkit.configure(railkitKey);
                    }
                    if (typeof railkit?.getTrainInfo === 'function') {
                        const rkRes = await railkit.getTrainInfo(trainNo);
                        const rkData = rkRes?.data || rkRes;
                        const route = rkData?.route || rkData?.stations || [];
                        if (Array.isArray(route) && route.length > 0) {
                            console.log(`[ScheduleEngine] RailKit HIT for ${trainNo} schedule (${route.length} stops)`);
                            scheduleData = route.map((st: any) => ({
                                station: {
                                    code: st.station_code || st.code || st.stationCode,
                                    name: st.station_name || st.name || st.stationName
                                },
                                arrival: st.arrival_time === 'Source' ? '--:--' : (st.arrival_time || st.arrival || '--:--'),
                                departure: st.departure_time === 'Destination' ? '--:--' : (st.departure_time || st.departure || '--:--'),
                                distance: st.distance !== undefined ? st.distance : (st.distanceFromSourceKm || 0),
                                arrivalDay: st.day || 1,
                                isHalt: st.isHalt !== undefined ? st.isHalt : (st.halt_minutes !== undefined ? st.halt_minutes > 0 : true)
                            }));
                            lastError = null;
                        }
                    }
                }
            } catch (rkErr: any) {
                console.warn(`[ScheduleEngine] RailKit schedule fallback failed: ${rkErr.message}`);
            }
        }

        if (lastError && scheduleData.length === 0) {
            throw lastError;
        }

        // RailRadar returns: station: { code, name }, arrival, departure, distance, arrivalDay, isHalt
        const adaptedSchedule = scheduleData.map((stop: any, index: number) => ({
            stationCode: stop.station?.code || stop.stationCode,
            stationName: stop.station?.name || stop.stationName,
            arrivalTime: stop.arrival || (stop.arrivalMinutes ? formatTime(stop.arrivalMinutes) : (index === 0 ? '--:--' : '--:--')),
            departureTime: stop.departure || (stop.departureMinutes ? formatTime(stop.departureMinutes) : (index === scheduleData.length - 1 ? '--:--' : '--:--')),
            distance: stop.distance !== undefined ? stop.distance : stop.distanceFromSourceKm,
            day: stop.arrivalDay || stop.departureDay || stop.day,
            isHalt: stop.isHalt
        })).filter((stop: any, idx: number, arr: any[]) => {
            // Keep first and last stations always
            if (idx === 0 || idx === arr.length - 1) return true;
            // Remove stations where train doesn't halt (arrival == departure or isHalt is explicitly false)
            if (stop.isHalt === false) return false;
            if (stop.arrivalTime === stop.departureTime && stop.arrivalTime !== '--:--') return false;
            return true;
        });

        if (adaptedSchedule.length > 0) {
            await CacheService.set(`schedule:${trainNo}`, JSON.stringify(adaptedSchedule), 24 * 60 * 60); // 24 hours
        }
        
        return res.json({ success: true, data: adaptedSchedule });

    } catch (error: any) {
        console.error('Schedule Error:', error.response?.data || error.message);
        return res.json({
            success: false,
            data: error.response?.data?.error?.message || "Failed to fetch train schedule."
        });
    }
});

export default router;
