"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPassengersOrBooking = cancelPassengersOrBooking;
const commission_1 = require("./commission");
async function cancelPassengersOrBooking(tx, bookingId, passengerNameToCancel) {
    // 1. Fetch booking with event and payment record
    const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { event: true, user: true }
    });
    if (!booking)
        throw new Error('Booking not found');
    if (booking.status === 'CANCELLED')
        throw new Error('Booking is already fully cancelled');
    // 2. Validate deadline: 1 day before journey date at 8:00 PM local time
    const now = new Date();
    const journeyDate = new Date(booking.event.date);
    const deadline = new Date(journeyDate);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(20, 0, 0, 0);
    if (now > deadline) {
        throw new Error('Cancellations/modifications are only allowed up to 1 day before 8:00 PM of the day before the journey.');
    }
    // 3. Get total paid amount
    let totalAmount = 0;
    if (booking.paymentId) {
        const paymentRecord = await tx.paymentRecord.findUnique({
            where: { paymentId: booking.paymentId }
        });
        if (paymentRecord) {
            totalAmount = paymentRecord.amount;
        }
    }
    // 4. Parse passengers from description
    const desc = booking.event.description;
    const passengerMatch = desc.match(/Passengers:\s*([^.]+)/i);
    if (!passengerMatch || !passengerMatch[1]) {
        throw new Error('No passenger manifest found in booking description');
    }
    const rawPText = passengerMatch[1].trim();
    if (rawPText.includes('Count:')) {
        throw new Error('Group/count bookings cannot be partially cancelled.');
    }
    const pList = rawPText.split(';').map(p => p.trim()).filter(p => p.length > 2);
    const totalPassengersCount = pList.length;
    if (totalPassengersCount === 0) {
        throw new Error('No passengers parsed from manifest');
    }
    // Identify active passengers (those not starting with [CANCELLED])
    const activePassengers = pList.filter(p => !p.startsWith('[CANCELLED]'));
    if (activePassengers.length === 0) {
        throw new Error('All passengers in this booking are already cancelled.');
    }
    let passengersToCancel = [];
    let isFullCancellation = false;
    if (passengerNameToCancel) {
        // Find the specific passenger matching passengerNameToCancel
        // The list contains names like "Passenger Name (Age), Gender"
        const matchedPassenger = activePassengers.find(p => {
            const namePart = p.split('(')[0].trim().toLowerCase();
            return namePart === passengerNameToCancel.trim().toLowerCase();
        });
        if (!matchedPassenger) {
            throw new Error(`Passenger "${passengerNameToCancel}" not found or already cancelled.`);
        }
        passengersToCancel = [matchedPassenger];
        isFullCancellation = activePassengers.length === 1;
    }
    else {
        // Cancel all remaining active passengers
        passengersToCancel = [...activePassengers];
        isFullCancellation = true;
    }
    // Update the passengers list
    const updatedPList = pList.map(p => {
        if (passengersToCancel.includes(p)) {
            return `[CANCELLED] ${p}`;
        }
        return p;
    });
    const newPassengersText = updatedPList.join('; ');
    const newDescription = desc.replace(/Passengers:\s*[^.]+/i, `Passengers: ${newPassengersText}`);
    // Update Event description
    await tx.event.update({
        where: { id: booking.eventId },
        data: { description: newDescription }
    });
    // If fully cancelled, update booking status
    if (isFullCancellation) {
        await tx.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' }
        });
    }
    // Calculate Refund Amount
    // Proportional amount per passenger
    const refundRatio = passengersToCancel.length / totalPassengersCount;
    const refundAmount = Math.round((totalAmount * refundRatio) * 100) / 100;
    let refund = null;
    if (booking.paymentId && refundAmount > 0) {
        const reason = passengerNameToCancel
            ? `Partial Cancellation: Passenger ${passengerNameToCancel}`
            : `Full Cancellation of remaining ${passengersToCancel.length} passengers`;
        // Dedup refund (ensure we do not refund more than totalAmount)
        const existingRefunds = await tx.refundRecord.findMany({
            where: { bookingId }
        });
        const totalRefundedYet = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
        const remainingRefundable = Math.max(0, totalAmount - totalRefundedYet);
        const finalRefundAmount = Math.min(refundAmount, remainingRefundable);
        if (finalRefundAmount > 0) {
            refund = await tx.refundRecord.create({
                data: {
                    paymentId: booking.paymentId,
                    amount: finalRefundAmount,
                    region: 'Global',
                    reason,
                    userId: booking.userId,
                    bookingId: bookingId,
                    status: 'AUTOMATED_PENDING'
                }
            });
        }
    }
    // Deduct proportional commission from Sales Manager
    await (0, commission_1.handlePartialBookingCancellation)(tx, bookingId, refundRatio);
    return { refund, isFullCancellation, refundAmount };
}
