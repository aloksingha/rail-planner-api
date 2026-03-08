import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

const RAPIDAPI_KEY = 'bf2a3e5aebmsh47dd2454d86a94ep16d33ejsnbc06de274f3b';
const BOOKING_HEADERS = {
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY,
};

/**
 * GET /api/cars/search
 * Proxy to Booking.com Car Rentals API
 * 
 * Required query params:
 *   pick_up_latitude, pick_up_longitude
 *   drop_off_latitude, drop_off_longitude
 *   pick_up_date (YYYY-MM-DD), drop_off_date (YYYY-MM-DD)
 *   pick_up_time (HH:MM), drop_off_time (HH:MM)
 *   driver_age, currency_code, location (country code)
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        const {
            pick_up_latitude = '40.6397018432617',
            pick_up_longitude = '-73.7791976928711',
            drop_off_latitude = '40.6397018432617',
            drop_off_longitude = '-73.7791976928711',
            pick_up_date,
            drop_off_date,
            pick_up_time = '10:00',
            drop_off_time = '10:00',
            driver_age = '30',
            currency_code = 'USD',
            location = 'US',
        } = req.query as Record<string, string>;

        // Default dates: tomorrow → day after tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 3);

        const pickDate = pick_up_date || tomorrow.toISOString().split('T')[0];
        const dropDate = drop_off_date || dayAfter.toISOString().split('T')[0];

        const params = new URLSearchParams({
            pick_up_latitude,
            pick_up_longitude,
            drop_off_latitude,
            drop_off_longitude,
            pick_up_date: pickDate,
            drop_off_date: dropDate,
            pick_up_time,
            drop_off_time,
            driver_age,
            currency_code,
            location,
        });

        console.log(`[CarSearch] pickup: ${pick_up_latitude},${pick_up_longitude} | ${pickDate} ${pick_up_time} → ${dropDate} ${drop_off_time}`);

        const response = await axios.get(
            `https://booking-com15.p.rapidapi.com/api/v1/cars/searchCarRentals?${params.toString()}`,
            { headers: BOOKING_HEADERS, timeout: 15000 }
        );

        if (!response.data?.status) {
            console.log('[CarSearch] API returned status=false:', response.data?.message);
            return res.status(400).json({
                success: false,
                error: typeof response.data?.message === 'string'
                    ? response.data.message
                    : 'Car rental search failed. Try different location or dates.',
            });
        }

        // Log top-level keys
        const raw = response.data?.data || response.data;
        console.log('[CarSearch] response keys:', Object.keys(response.data || {}));
        if (raw?.search_results) {
            console.log('[CarSearch] First result keys:', Object.keys(raw.search_results[0] || {}));
            console.log('[CarSearch] First result sample:', JSON.stringify(raw.search_results[0], null, 2).substring(0, 2000));
        } else {
            console.log('[CarSearch] Raw sample:', JSON.stringify(raw, null, 2).substring(0, 2000));
        }

        // Adapt results
        const results: any[] = raw?.search_results || raw?.results || (Array.isArray(raw) ? raw : []);
        const days = Math.max(1, Math.ceil((new Date(dropDate).getTime() - new Date(pickDate).getTime()) / 86400000));

        const cars = results.map((car: any) => {
            const vehicle = car.vehicle_info || car.vehicle || car;
            const pricing = car.pricing_info || car.price_info || car;
            const supplier = car.supplier_info || car.supplier || {};

            const name = vehicle.v_name || vehicle.name || vehicle.category || car.name || 'Unknown Car';
            const category = vehicle.category || vehicle.group || car.category || '—';
            const seats = vehicle.seats || vehicle.capacity || car.seats || '—';
            const doors = vehicle.doors || car.doors || '—';
            const transmission = vehicle.transmission || vehicle.gearbox || car.transmission || '—';
            const fuelType = vehicle.fuel_type || vehicle.fuel || car.fuel_type || '—';
            const aircon = vehicle.aircon ?? vehicle.air_conditioning ?? car.air_conditioning ?? true;
            const imageUrl = vehicle.image_url || vehicle.image || car.image_url || car.image || '';

            const basePrice = pricing.base_price || pricing.price || pricing.total_price || car.price || 0;
            const totalPrice = pricing.total_price || pricing.total || car.total_price || (Number(basePrice) * days) || 0;
            const currency = pricing.currency || pricing.currency_code || car.currency || currency_code;

            const supplierName = supplier.name || supplier.company_name || car.company_name || car.supplier || 'Unknown';
            const supplierLogo = supplier.logo || supplier.image || '';
            const rating = car.rating || car.review_score || car.score || null;
            const reviewCount = car.review_count || car.reviews_count || null;
            const freeCancellation = car.free_cancellation ?? car.cancellation_is_free ?? false;

            return {
                id: car.search_key || car.id || car.car_id || Math.random().toString(36).slice(2, 8),
                name,
                category,
                seats,
                doors,
                transmission,
                fuelType,
                aircon,
                imageUrl,
                basePrice: Math.round(Number(basePrice)),
                totalPrice: Math.round(Number(totalPrice)),
                pricePerDay: totalPrice ? Math.round(Number(totalPrice) / days) : Math.round(Number(basePrice)),
                currency,
                supplier: supplierName,
                supplierLogo,
                rating,
                reviewCount,
                freeCancellation,
                days,
            };
        }).filter((c: any) => c.totalPrice > 0 || c.basePrice > 0);

        console.log(`[CarSearch] Returning ${cars.length} cars`);
        return res.json({ success: true, count: cars.length, data: cars });

    } catch (error: any) {
        console.error('[CarSearch] Error:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.message || error.message || 'Car rental search failed',
        });
    }
});

export default router;
