import axios from 'axios';

const WEBHOOK_SECRET = 'ticket-pro-internal-secret';
// Use the local emulator URL if running locally, otherwise fall back to environment variable
const FUNCTIONS_URL = process.env.FIREBASE_FUNCTIONS_URL || 'http://127.0.0.1:5001/new-project/us-central1/sendNotification';

export const notifyBookingConfirmed = async (email: string, eventName: string) => {
    try {
        await axios.post(FUNCTIONS_URL, {
            type: 'BOOKING_CONFIRMED',
            email,
            details: { event: eventName }
        }, {
            headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` }
        });
    } catch (e: any) {
        console.error('Firebase Notification Dispatch failed:', e?.message || e);
    }
}

export const notifyBookingCancelled = async (email: string, reason: string) => {
    try {
        await axios.post(FUNCTIONS_URL, {
            type: 'BOOKING_CANCELLED',
            email,
            details: { reason }
        }, {
            headers: { Authorization: `Bearer ${WEBHOOK_SECRET}` }
        });
    } catch (e: any) {
        console.error('Firebase Notification Dispatch failed:', e?.message || e);
    }
}
