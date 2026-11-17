import axios from 'axios';
import { Capacitor } from '@capacitor/core';

/**
 * Handles the Google Auth success payload and communicates with the backend.
 */
export const processGoogleAuth = async (tokenResponse: any, roleType: string) => {
    const payload: any = {};
    if (tokenResponse.credential) {
        payload.credential = tokenResponse.credential;
    } else if (tokenResponse.access_token) {
        payload.access_token = tokenResponse.access_token;
    }

    const platform = Capacitor.isNativePlatform() ? 'APP' : 'WEB';

    const { data } = await axios.post('/api/auth/google', {
        ...payload,
        roleType,
        platform
    });
    return data;
};

/**
 * Handles the test login bypass logic.
 */
export const processTestLogin = async (email: string, password: string) => {
    const platform = Capacitor.isNativePlatform() ? 'APP' : 'WEB';
    const { data } = await axios.post('/api/auth/bypass', {
        email: email || 'test@ticketspro.in',
        password: password || 'test1234',
        platform
    });
    return data;
};

/**
 * Manages the "Remember Me" persistence logic.
 */
export const updateRememberMe = (rememberMe: boolean, email: string, roleType: string) => {
    if (rememberMe) {
        localStorage.setItem('rememberedEmail', email || 'test@ticketspro.in');
        localStorage.setItem('rememberedRole', roleType);
    } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedRole');
    }
};

/**
 * High Intensity Asset Warming & Component Pre-fetching (Deferred)
 */
export const warmUpAssets = (roleType: string) => {
    // Low-priority background ping to wake Render server and DB connection pool while user is on login screen
    axios.get('/health').catch(() => {});

    const doWarmup = () => {
        if (roleType === 'CUSTOMER') {
            import('../pages/CustomerDashboard');
            import('../pages/CustomerBookings');
        } else if (roleType === 'ADMIN') {
            import('../pages/DashboardHome');
            import('../pages/BookingManagement');
        } else if (roleType === 'SALES_MANAGER') {
            import('../pages/DashboardHome');
            import('../pages/SalesOptions');
        }
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => setTimeout(doWarmup, 500));
    } else {
        setTimeout(doWarmup, 1000);
    }
};
