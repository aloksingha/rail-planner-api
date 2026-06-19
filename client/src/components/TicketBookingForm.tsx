import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';

const TicketBookingFormWeb = lazy(() => import('./TicketBookingFormWeb'));
const TicketBookingFormAndroid = lazy(() => import('./TicketBookingFormAndroid'));

export default function TicketBookingForm({ prefillData }: { prefillData?: any }) {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-8 h-8 border-3 border-brand-teal/20 rounded-full animate-spin border-t-brand-teal" />
            </div>
        }>
            {Capacitor.isNativePlatform() ? (
                <TicketBookingFormAndroid prefillData={prefillData} />
            ) : (
                <TicketBookingFormWeb prefillData={prefillData} />
            )}
        </Suspense>
    );
}
