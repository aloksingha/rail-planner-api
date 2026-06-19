import axios from 'axios';

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

    const { data } = await axios.post('/api/auth/google', {
        ...payload,
        roleType
    });
    return data;
};

/**
 * Handles the test login bypass logic.
 */
export const processTestLogin = async (email: string, password: string) => {
    const { data } = await axios.post('/api/auth/bypass', {
        email: email || 'test@ticketspro.in',
        password: password || 'test1234'
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
 * High Intensity Asset Warming & Component Pre-fetching
 */
export const warmUpAssets = (roleType: string) => {
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
