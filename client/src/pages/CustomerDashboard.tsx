import { Capacitor } from '@capacitor/core';
import CustomerDashboardWeb from './CustomerDashboardWeb';
import CustomerDashboardAndroid from './CustomerDashboardAndroid';

export default function CustomerDashboard() {
    return Capacitor.isNativePlatform() ? (
        <CustomerDashboardAndroid />
    ) : (
        <CustomerDashboardWeb />
    );
}

