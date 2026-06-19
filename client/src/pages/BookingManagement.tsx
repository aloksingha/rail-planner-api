import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';

const BookingManagementWeb = lazy(() => import('./BookingManagementWeb'));
const BookingManagementAndroid = lazy(() => import('./BookingManagementAndroid'));

export default function BookingManagement() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-8 h-8 border-3 border-brand-teal/20 rounded-full animate-spin border-t-brand-teal" />
            </div>
        }>
            {Capacitor.isNativePlatform() ? (
                <BookingManagementAndroid />
            ) : (
                <BookingManagementWeb />
            )}
        </Suspense>
    );
}
