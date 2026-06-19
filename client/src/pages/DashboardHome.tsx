import { Capacitor } from '@capacitor/core';
import DashboardHomeWeb from './DashboardHomeWeb';
import DashboardHomeAndroid from './DashboardHomeAndroid';

export default function DashboardHome({ role }: { role?: string }) {
    return Capacitor.isNativePlatform() ? (
        <DashboardHomeAndroid role={role} />
    ) : (
        <DashboardHomeWeb role={role} />
    );
}

