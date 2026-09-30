"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const keys_1 = require("../utils/keys");
const RAILRADAR_BASE_URL = 'https://api.railradar.in/v1';
const formatTime = (minutes) => {
    const min = minutes % 60;
    let h = Math.floor(minutes / 60);
    if (h >= 24)
        h %= 24;
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
};
const formatTravelTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};
const CACHE_TTL = 15 * 60; // 15 minutes in seconds
const SEARCH_VERSION = 'v3.16-concurrency-fix'; // Bumped to invalidate old caches for GST
const cache_1 = require("../utils/cache");
const pricing_1 = require("../utils/pricing");
const prisma_1 = require("../prisma");
router.get('/getTrainOn', async (req, res) => {
    try {
        const { from, to, date, class: reqClass } = req.query;
        if (!from || !to || !date) {
            return res.status(400).json({ success: false, data: "Missing query parameters" });
        }
        const cacheKey = `train_search:${from}-${to}-${date}-${reqClass || 'ALL'}-${SEARCH_VERSION}`;
        const cached = await cache_1.CacheService.get(cacheKey);
        if (cached) {
            console.log(`[TrainCache] HIT for ${cacheKey}`);
            return res.json({ success: true, data: JSON.parse(cached) });
        }
        // Fetch all context data in parallel
        const [corridors, customPrices, rules, specialCharges, mappings, nearbys] = await Promise.all([
            prisma_1.prisma.corridorPricing.findMany(),
            prisma_1.prisma.priceRequest.findMany({ where: { status: 'UPDATED' } }),
            prisma_1.prisma.pricingRule.findMany(),
            prisma_1.prisma.specialCharge.findMany(),
            prisma_1.prisma.stationMapping.findMany(),
            prisma_1.prisma.stationNearby.findMany()
        ]);
        const pricingContext = {
            corridors,
            customPrices,
            rules,
            specialCharges,
            mappings,
            nearbys
        };
        // ❌ Block "Intra-City" searches to prevent confusion
        const nearbyCodes = nearbys
            .filter(n => n.stationCode === from)
            .map(n => n.nearbyCode);
        const isSameCluster = from === to || nearbyCodes.includes(to);
        if (isSameCluster) {
            console.log(`[TrainSearch] BLOCKED: Intra-city search detected (${from} -> ${to})`);
            return res.json({ success: true, data: [] });
        }
        const dateParts = date.split('-');
        const journeyDate = new Date(parseInt(dateParts[2]), // Year
        parseInt(dateParts[1]) - 1, // Month index
        parseInt(dateParts[0]) // Day
        );
        const dayFullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayFullName = dayFullNames[journeyDate.getDay()];
        console.log(`[TrainSearch] ${from} to ${to} on ${date} [Day: ${dayFullName}]`);
        // Helper to fetch from API with dual-engine failover
        const fetchRemote = async (src, dst, isFallback = false) => {
            const maxRetries = 3;
            let lastError = null;
            for (let i = 0; i < maxRetries; i++) {
                const key = (0, keys_1.getRailRadarKey)();
                try {
                    console.log(`[SearchEngine] Trying RailRadar with key ${key.substring(0, 8)}...`);
                    // Convert DD-MM-YYYY to YYYY-MM-DD for the new RailRadar API
                    const apiDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                    const response = await axios_1.default.get(`${RAILRADAR_BASE_URL}/trains/between/${src}/${dst}?date=${apiDate}`, {
                        headers: {
                            'Authorization': `Bearer ${key}`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Accept-Language': 'en-US,en;q=0.9'
                        },
                        timeout: 8000
                    });
                    const externalTrains = response.data?.trains || response.data?.data?.trains || [];
                    console.log(`[SearchEngine] RailRadar ${isFallback ? 'Proximity' : 'Direct'} HIT for ${src}->${dst} (${externalTrains.length} trains)`);
                    return externalTrains.map((t) => {
                        const durHrs = Math.floor(t.duration / 60);
                        const durRem = t.duration % 60;
                        const srcMins = parseInt(t.from.departure.split(':')[0]) * 60 + parseInt(t.from.departure.split(':')[1]) + (t.from.day - 1) * 1440;
                        const dstMins = parseInt(t.to.arrival.split(':')[0]) * 60 + parseInt(t.to.arrival.split(':')[1]) + (t.to.day - 1) * 1440;
                        const dayMap = {
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
                                days: (Array.isArray(t.train.runDays) ? t.train.runDays : (typeof t.train.runDays === 'string' ? t.train.runDays.split(',') : [])).map((d) => dayMap[d.trim().toLowerCase()] || d),
                                allDays: (t.train.runDays || []).length === 7 || (typeof t.train.runDays === 'string' && t.train.runDays.toLowerCase() === 'daily')
                            },
                            isAlternative: isFallback
                        };
                    });
                }
                catch (e) {
                    lastError = e;
                    const status = e.response?.status;
                    if (status === 401 || status === 403 || status === 429) {
                        console.log(`[RailRadar] Key ${key.substring(0, 8)} throttled/invalid (Status: ${status}). Body: ${typeof e.response?.data === 'string' ? e.response?.data.substring(0, 200) : 'JSON'}. Trying next...`);
                        continue;
                    }
                    console.warn(`[RailRadar] Failed with status ${status}, breaking loop to try Offline. Error: ${e.message}`);
                    break;
                }
            }
            console.warn(`[SearchEngine] ALL ENGINES FAILED! Using Offline Trains Fallback for ${src}->${dst}`);
            // --- ENGINE 3: OFFLINE TRAINS FALLBACK ---
            try {
                const fs = require('fs');
                const path = require('path');
                const localPath = path.join(process.cwd(), 'src/data/offline_trains.json');
                if (fs.existsSync(localPath)) {
                    const offlineData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
                    const matchedTrains = offlineData.filter((t) => t.stops.includes(src) && t.stops.includes(dst) &&
                        t.stops.indexOf(src) < t.stops.indexOf(dst));
                    if (matchedTrains.length > 0) {
                        return matchedTrains.map((t) => {
                            const srcTime = t.times[src];
                            const dstTime = t.times[dst];
                            const parseToMins = (timeStr) => {
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
                                train_class_details: t.classes.map((c) => ({ classCode: c })),
                                isAlternative: isFallback
                            };
                        });
                    }
                }
            }
            catch (e) {
                console.error(`[SearchEngine] Offline Fallback Error: ${e.message}`);
            }
            // If even offline fails or no trains found, return empty array instead of crashing
            return [];
        };
        // 1. Primary Direct Search
        let allRemoteTrains = await fetchRemote(from, to, false);
        // 2. Proximity Search - Expanding reach to capture all city-area terminals (e.g. DEC, DEE, SBIB)
        // 2. Proximity Search - Expanding reach to capture all city-area terminals
        const sourceAlts = [from, ...nearbys.filter(n => n.stationCode === from).map(n => n.nearbyCode)].slice(0, 10);
        const destAlts = [to, ...nearbys.filter(n => n.stationCode === to).map(n => n.nearbyCode)].slice(0, 10);
        const pairs = [];
        for (const s of sourceAlts) {
            for (const d of destAlts) {
                if (s === from && d === to)
                    continue;
                pairs.push({ s, d });
            }
        }
        console.log(`[TrainSearch] Proactively searching ${pairs.length} proximity pairs...`);
        // Execute fallback searches in parallel for better performance
        const fallbackResults = [];
        const chunkSize = 4;
        for (let i = 0; i < pairs.length; i += chunkSize) {
            const chunk = pairs.slice(i, i + chunkSize);
            const proximityResults = await Promise.allSettled(chunk.map(pair => fetchRemote(pair.s, pair.d, true)));
            proximityResults.forEach((res, idx) => { if (res.status === 'fulfilled') {
                fallbackResults.push(...res.value);
            }
            else {
                console.warn(`[TrainSearch] Proximity pair ${chunk[idx].s}->${chunk[idx].d} failed: ${res.reason?.message}`);
            } });
            if (i + chunkSize < pairs.length) {
                await new Promise(resolve => setTimeout(resolve, 350));
            }
        }
        // Combine nearby and direct results (Priority: Direct > Closest Nearby > Furthest Nearby)
        allRemoteTrains = [...allRemoteTrains, ...fallbackResults];
        const shiftDay = (dayName, shift) => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const idx = days.indexOf(dayName);
            if (idx === -1)
                return dayName;
            const newIdx = (idx + shift) % 7;
            const finalIdx = newIdx >= 0 ? newIdx : newIdx + 7;
            return days[finalIdx];
        };
        const adaptedTrains = allRemoteTrains
            .filter((t) => {
            const depDay = t.fromStationSchedule?.day ?? 1;
            // To depart search station on journeyDate, train must start from origin at journeyDate - (depDay - 1) days
            const originDate = new Date(journeyDate);
            originDate.setDate(originDate.getDate() - (depDay - 1));
            const originDayFullName = dayFullNames[originDate.getDay()];
            const rd = t.runningDays;
            if (!rd || rd.allDays === true)
                return true;
            const daysList = rd.days || [];
            return daysList.includes(originDayFullName);
        })
            .map((t) => {
            const depDay = t.fromStationSchedule?.day ?? 1;
            const arrDay = t.toStationSchedule?.day ?? depDay;
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const indexToDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            let running_days = {};
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
            let available_classes = [];
            const classesSource = t.classes || t.availableClasses || t.train_class_details || [];
            if (Array.isArray(classesSource)) {
                available_classes = classesSource.map((c) => (typeof c === 'string' ? c : (c.code || c.classCode || c.class_cd || '')).toUpperCase()).filter(Boolean);
            }
            // RapidAPI mapping vs RailRadar mapping
            const depMinsBase = t.fromStationSchedule?.departureMinutes ?? t.from_std_mins ?? 0;
            const arrMinsBase = t.toStationSchedule?.arrivalMinutes ?? t.to_sta_mins ?? 0;
            const depMinsTotal = t.fromStationSchedule ? (((depDay - 1) * 1440) + depMinsBase) : (t.from_std_mins ?? 0);
            const arrMinsTotal = t.toStationSchedule ? (((arrDay - 1) * 1440) + arrMinsBase) : (t.to_sta_mins ?? 0);
            let segmentMins = arrMinsTotal - depMinsTotal;
            if (segmentMins <= 0)
                segmentMins = t.travelTimeMinutes || 0;
            const travelTimeStr = formatTravelTime(segmentMins);
            // Calculate calendar departure and arrival dates
            const depDateObj = new Date(journeyDate);
            const arrDateObj = new Date(journeyDate);
            // Fix: Calculate exact day diff using total minutes from origin
            const addedDays = Math.floor(arrMinsTotal / 1440) - Math.floor(depMinsTotal / 1440);
            arrDateObj.setDate(arrDateObj.getDate() + addedDays);
            const formatDate = (d) => {
                const day = d.getDate().toString().padStart(2, '0');
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const year = d.getFullYear();
                return `${day}-${month}-${year}`;
            };
            const formatDateFriendly = (d) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}`;
            };
            const departure_date = formatDate(depDateObj);
            const arrival_date = formatDate(arrDateObj);
            const departure_date_friendly = formatDateFriendly(depDateObj);
            const arrival_date_friendly = formatDateFriendly(arrDateObj);
            const prices = {};
            ['SL', '3A', '2A', 'CC', '3E', '1A', '2S', 'FC', 'EV', 'EC'].forEach(cls => {
                prices[cls] = (0, pricing_1.getTicketPrice)(from, to, cls, t.trainName || t.train_name, travelTimeStr, pricingContext);
            });
            // FIX PRICING ERRORS: Enforce logical hierarchy
            if (prices['SL'] && prices['3A'] && prices['SL'] >= prices['3A'])
                prices['3A'] = prices['SL'] + 800;
            if (prices['3A'] && prices['2A'] && prices['3A'] >= prices['2A'])
                prices['2A'] = prices['3A'] + 1000;
            if (prices['2A'] && prices['1A'] && prices['2A'] >= prices['1A'])
                prices['1A'] = prices['2A'] + 1500;
            if (prices['CC'] && prices['EC'] && prices['CC'] >= prices['EC'])
                prices['EC'] = prices['CC'] + 1000;
            if (prices['EC'] && prices['EV'] && prices['EC'] >= prices['EV'])
                prices['EV'] = prices['EC'] + 500;
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
        const filteredTrains = adaptedTrains.filter((t) => {
            const tName = String(t.train_base.train_name).toUpperCase();
            const tType = String(t.train_base.train_type).toUpperCase();
            const tNo = String(t.train_base.train_no).trim();
            // Indian Railway regional passenger, local, MEMU, and DEMU train number checks
            const isPassengerNo = /^[567]\d{4}$/.test(tNo);
            // 1. Filter out Passenger, DEMU, MEMU, and Local trains
            if (tType === 'PASSENGER' || tType.includes('PASS') || tType.includes('DEMU') || tType.includes('MEMU') || tType.includes('LOCAL') ||
                tName.includes('PASSENGER') || tName.includes('PASSGR') || tName.includes('DEMU') || tName.includes('MEMU') || tName.includes('LOCAL') ||
                isPassengerNo) {
                console.log(`[TrainSearch] Filtering out Passenger train: ${t.train_base.train_name} (${t.train_base.train_no})`);
                return false;
            }
            // 2. Filter out trains that only carry 2S class (or no classes, which falls back to passenger types)
            const avCls = t.train_base.available_classes || [];
            const filteredCls = ['SL', '3A', '2A', 'CC', '3E', '1A', '2S', 'FC', 'EV', 'EC'].filter((c) => avCls.includes(c));
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
            await cache_1.CacheService.set(cacheKey, JSON.stringify(uniqueTrains), CACHE_TTL);
        }
        return res.json({ success: true, data: uniqueTrains });
    }
    catch (error) {
        console.error('Train Search Error:', error.response?.data || error.message);
        return res.json({ success: false, data: "Failed to fetch trains." });
    }
});
router.get('/schedule/:trainNo', async (req, res) => {
    try {
        const { trainNo } = req.params;
        const cacheKey = `schedule:${trainNo}`;
        const cached = await cache_1.CacheService.get(cacheKey);
        if (cached) {
            console.log(`[ScheduleCache] HIT for ${trainNo}`);
            return res.json({ success: true, data: JSON.parse(cached) });
        }
        const maxRetries = 3;
        let lastError = null;
        let scheduleData = [];
        for (let i = 0; i < maxRetries; i++) {
            const key = (0, keys_1.getRailRadarKey)();
            try {
                // The correct endpoint in RailRadar for a train's details and route is /trains/:trainNo
                const response = await axios_1.default.get(`${RAILRADAR_BASE_URL}/trains/${trainNo}`, {
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
            }
            catch (e) {
                lastError = e;
                if (e.response?.status === 429 || e.response?.status === 401 || e.response?.status === 403) {
                    continue; // Try next key
                }
                break; // Stop and try fallback
            }
        }
        if (lastError && scheduleData.length === 0) {
            throw lastError;
        }
        // RailRadar returns: station: { code, name }, arrival, departure, distance, arrivalDay, isHalt
        const adaptedSchedule = scheduleData.map((stop, index) => ({
            stationCode: stop.station?.code || stop.stationCode,
            stationName: stop.station?.name || stop.stationName,
            arrivalTime: stop.arrival || (stop.arrivalMinutes ? formatTime(stop.arrivalMinutes) : (index === 0 ? '--:--' : '--:--')),
            departureTime: stop.departure || (stop.departureMinutes ? formatTime(stop.departureMinutes) : (index === scheduleData.length - 1 ? '--:--' : '--:--')),
            distance: stop.distance !== undefined ? stop.distance : stop.distanceFromSourceKm,
            day: stop.arrivalDay || stop.departureDay || stop.day,
            isHalt: stop.isHalt
        })).filter((stop, idx, arr) => {
            // Keep first and last stations always
            if (idx === 0 || idx === arr.length - 1)
                return true;
            // Remove stations where train doesn't halt (arrival == departure or isHalt is explicitly false)
            if (stop.isHalt === false)
                return false;
            if (stop.arrivalTime === stop.departureTime && stop.arrivalTime !== '--:--')
                return false;
            return true;
        });
        if (adaptedSchedule.length > 0) {
            await cache_1.CacheService.set(`schedule:${trainNo}`, JSON.stringify(adaptedSchedule), 24 * 60 * 60); // 24 hours
        }
        return res.json({ success: true, data: adaptedSchedule });
    }
    catch (error) {
        console.error('Schedule Error:', error.response?.data || error.message);
        return res.json({
            success: false,
            data: error.response?.data?.error?.message || "Failed to fetch train schedule."
        });
    }
});
exports.default = router;
