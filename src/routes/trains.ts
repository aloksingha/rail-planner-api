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

router.get('/getTrainOn', async (req: Request, res: Response) => {
    try {
        const { from, to, date } = req.query;

        if (!from || !to || !date) {
            return res.status(400).json({ success: false, data: "Missing query parameters" });
        }

        // FIX: Parse date as LOCAL time to avoid UTC timezone off-by-one day issue.
        // Using new Date("YYYY-MM-DD") parses as UTC midnight, which in IST (+5:30)
        // would be the previous day, causing wrong day-of-week and trains being filtered out.
        const dateParts = (date as string).split('-');
        const journeyDate = new Date(
            parseInt(dateParts[2]), // Year
            parseInt(dateParts[1]) - 1, // Month index
            parseInt(dateParts[0])  // Day
        );
        // RailRadar API returns runningDays as: { days: ["Mon", "Tue", "Fri"], allDays: false }
        // We need to check if the journey day (full name like "Tue") is in the array.
        const dayFullNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayFullName = dayFullNames[journeyDate.getDay()];

        console.log(`[TrainSearch] ${from} to ${to} on ${date} [Day: ${dayFullName}]`);

        const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/between?from=${from}&to=${to}&date=${date}`, {
            headers: {
                'X-Api-Key': RAILRADAR_API_KEY,
                'Accept': 'application/json'
            }
        });

        const externalTrains = response.data?.data?.trains || [];
        console.log(`[TrainSearch] Raw trains from API: ${externalTrains.length}`);

        const adaptedTrains = externalTrains
            .filter((t: any) => {
                const rd = t.runningDays;
                // If no runningDays info, keep the train
                if (!rd) return true;
                // If allDays is true, the train runs every day
                if (rd.allDays === true) return true;
                // Otherwise check if the journey day is in the days array
                const daysArray: string[] = rd.days || [];
                const isRunning = daysArray.includes(dayFullName);
                if (!isRunning) {
                    console.log(`[TrainSearch] Filtered: ${t.trainNumber} ${t.trainName} (only runs: ${daysArray.join(', ')})`);
                }
                return isRunning;
            })
            .map((t: any) => {
                const rd = t.runningDays;
                // Convert the days array format to our legacy bool-map format for the frontend
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
                let running_days: Record<string, boolean> | null = null;
                if (rd) {
                    running_days = {};
                    dayKeys.forEach((key, i) => {
                        running_days![key] = rd.allDays === true || (rd.days || []).includes(dayNames[i]);
                    });
                }

                // Extract available class codes — try multiple field names used by various IRCTC/rail APIs
                let available_classes: string[] = [];
                if (Array.isArray(t.classes) && t.classes.length > 0) {
                    available_classes = t.classes.map((c: any) =>
                        (typeof c === 'string' ? c : (c.code || c.classCode || c.class_code || '')).toUpperCase()
                    ).filter(Boolean);
                } else if (Array.isArray(t.availableClasses) && t.availableClasses.length > 0) {
                    available_classes = t.availableClasses.map((c: any) =>
                        (typeof c === 'string' ? c : (c.code || c.classCode || '')).toUpperCase()
                    ).filter(Boolean);
                } else if (Array.isArray(t.train_class_details) && t.train_class_details.length > 0) {
                    available_classes = t.train_class_details.map((c: any) =>
                        (c.class_cd || c.code || '').toUpperCase()
                    ).filter(Boolean);
                } else if (typeof t.availableClassCodes === 'string') {
                    available_classes = t.availableClassCodes.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                }

                if (available_classes.length > 0) {
                    console.log(`[TrainSearch] ${t.trainNumber} classes: ${available_classes.join(', ')}`);
                }

                return {
                    train_base: {
                        train_no: t.trainNumber,
                        train_name: t.trainName,
                        train_type: t.type, // Added train type
                        from_stn_name: t.sourceStationName,
                        to_stn_name: t.destinationStationName,
                        from_time: formatTime(t.fromStationSchedule?.departureMinutes || 0),
                        to_time: formatTime(t.toStationSchedule?.arrivalMinutes || 0),
                        travel_time: formatTravelTime(t.travelTimeMinutes || 0),
                        running_days,
                        available_classes,
                    }
                };
            });

        console.log(`[TrainSearch] Returning ${adaptedTrains.length} trains after filtering`);
        return res.json({ success: true, data: adaptedTrains });

    } catch (error: any) {
        console.error('RailRadar Train Search Error:', error.response?.data || error.message);
        return res.json({
            success: false,
            data: error.response?.data?.error?.message || "Failed to fetch trains."
        });
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
