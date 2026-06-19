
import { Capacitor } from '@capacitor/core';
import LoginPageWeb from './LoginPageWeb';
import LoginPageAndroid from './LoginPageAndroid';

interface LoginPageProps {
    setToken: (token: string) => void;
    roleType: 'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN';
    isAuthenticated: boolean;
}

export default function LoginPage(props: LoginPageProps) {
    return Capacitor.isNativePlatform() ? (
        <LoginPageAndroid {...props} />
    ) : (
        <LoginPageWeb {...props} />
    );
}

