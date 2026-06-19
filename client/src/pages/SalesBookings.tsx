import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';

const SalesBookingsWeb = lazy(() => import('./SalesBookingsWeb'));
const SalesBookingsAndroid = lazy(() => import('./SalesBookingsAndroid'));

export default function SalesBookings() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-8 h-8 border-3 border-brand-teal/20 rounded-full animate-spin border-t-brand-teal" />
            </div>
        }>
            {Capacitor.isNativePlatform() ? (
                <SalesBookingsAndroid />
            ) : (
                <SalesBookingsWeb />
            )}
        </Suspense>
    );
}
