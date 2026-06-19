import { lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';

const WalletDashboardWeb = lazy(() => import('./WalletDashboardWeb'));
const WalletDashboardAndroid = lazy(() => import('./WalletDashboardAndroid'));

export default function WalletDashboard() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-8 h-8 border-3 border-brand-teal/20 rounded-full animate-spin border-t-brand-teal" />
            </div>
        }>
            {Capacitor.isNativePlatform() ? (
                <WalletDashboardAndroid />
            ) : (
                <WalletDashboardWeb />
            )}
        </Suspense>
    );
}
