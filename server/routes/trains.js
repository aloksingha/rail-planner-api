"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const keys_1 = require("../utils/keys");
const RAILRADAR_BASE_URL = 'https://api.railradar.org/api/v1';
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
// SIMPLE IN-MEMORY CACHE for Train Search
const trainCache = new Map();
const scheduleCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const SEARCH_VERSION = 'v3.8-kne-tvc-corridor-update'; // Bump for enroute Northeast-South corridor pricing
const pricing_1 = require("../utils/pricing");
const prisma_1 = require("../prisma");
router.get('/getTrainOn', async (req, res) => {
    try {
        const { from, to, date, class: reqClass } = req.query;
        if (!from || !to || !date) {
            return res.status(400).json({ success: false, data: "Missing query parameters" });
        }
        const cacheKey = `${from}-${to}-${date}-${reqClass || 'ALL'}-${SEARCH_VERSION}`;
        const cached = trainCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            console.log(`[TrainCache] HIT for ${cacheKey}`);
            return res.json({ success: true, data: cached.data });
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
        // Helper to fetch from API using RailRadar (Primary)
        const fetchRemote = async (src, dst, isFallback = false) => {
            const maxRetries = 3;
            let lastError = null;
            for (let i = 0; i < maxRetries; i++) {
                const key = (0, keys_1.getRailRadarKey)();
                try {
                    const response = await axios_1.default.get(`${RAILRADAR_BASE_URL}/trains/between?from=${src}&to=${dst}&date=${date}`, {
                        headers: { 'X-Api-Key': key, 'Accept': 'application/json' }
                    });
                    const externalTrains = response.data?.data?.trains || [];
                    console.log(`[SearchEngine] RailRadar ${isFallback ? 'Proximity' : 'Direct'} HIT for ${src}->${dst} (${externalTrains.length} trains)`);
                    return externalTrains.map((t) => ({ ...t, isAlternative: isFallback }));
                }
                catch (e) {
                    lastError = e;
                    const status = e.response?.status;
                    if (status === 401 || status === 403 || status === 429) {
                        console.log(`[RailRadar] Key ${key.substring(0, 8)} throttled/invalid. Trying next...`);
                        continue;
                    }
                    throw e;
                }
            }
            throw lastError || new Error('All search engines failed');
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
        const proximityResults = await Promise.allSettled(pairs.map(pair => fetchRemote(pair.s, pair.d, true)));
        proximityResults.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
                fallbackResults.push(...res.value);
            }
            else {
                console.warn(`[TrainSearch] Proximity pair ${pairs[idx].s}->${pairs[idx].d} failed: ${res.reason?.message}`);
            }
        });
        // Combine nearby and direct results (Direct results at the end so they overwrite alternative ones in the Map)
        allRemoteTrains = [...fallbackResults, ...allRemoteTrains];
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
            const depMinsTotal = ((depDay - 1) * 1440) + depMinsBase;
            const arrMinsTotal = ((arrDay - 1) * 1440) + arrMinsBase;
            let segmentMins = arrMinsTotal - depMinsTotal;
            if (segmentMins <= 0)
                segmentMins = t.travelTimeMinutes || 0;
            const travelTimeStr = formatTravelTime(segmentMins);
            // Calculate calendar departure and arrival dates
            const depDateObj = new Date(journeyDate);
            const arrDateObj = new Date(journeyDate);
            arrDateObj.setDate(arrDateObj.getDate() + (arrDay - depDay));
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
            return {
                isAlternative: t.isAlternative,
                train_base: {
                    train_no: t.trainNumber || t.train_no,
                    train_name: t.trainName || t.train_name,
                    train_type: t.type || t.train_type || 'EXPRESS',
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
        // Deduplicate
        const uniqueTrains = Array.from(new Map(filteredTrains.map((t) => [t.train_base.train_no, t])).values());
        console.log(`[TrainSearch] Returning ${uniqueTrains.length} unique trains`);
        trainCache.set(cacheKey, { data: uniqueTrains, expiry: Date.now() + CACHE_TTL });
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
        const cached = scheduleCache.get(String(trainNo));
        if (cached && cached.expiry > Date.now()) {
            console.log(`[ScheduleCache] HIT for ${trainNo}`);
            return res.json({ success: true, data: cached.data });
        }
        const maxRetries = 3;
        let lastError = null;
        let scheduleData = [];
        for (let i = 0; i < maxRetries; i++) {
            const key = (0, keys_1.getRailRadarKey)();
            try {
                const response = await axios_1.default.get(`${RAILRADAR_BASE_URL}/trains/${trainNo}/schedule`, {
                    headers: { 'X-Api-Key': key, 'Accept': 'application/json' }
                });
                scheduleData = response.data?.data?.route || [];
                lastError = null;
                break; // Success!
            }
            catch (e) {
                lastError = e;
                if (e.response?.status === 429 || e.response?.status === 401 || e.response?.status === 403) {
                    continue; // Try next key
                }
                throw e; // Critical error
            }
        }
        if (lastError)
            throw lastError;
        const adaptedSchedule = scheduleData.map((stop) => ({
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
    }
    catch (error) {
        console.error('RailRadar Schedule Error:', error.response?.data || error.message);
        return res.json({
            success: false,
            data: error.response?.data?.error?.message || "Failed to fetch train schedule."
        });
    }
});
exports.default = router;
