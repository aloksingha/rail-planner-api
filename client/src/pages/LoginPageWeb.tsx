import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import brandLogo from '../assets/brand_logo.png';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

import { processGoogleAuth, processTestLogin, updateRememberMe, warmUpAssets } from '../utils/authUtils';

interface LoginPageProps {
    setToken: (t: string) => void;
    roleType: 'CUSTOMER' | 'ADMIN' | 'SALES_MANAGER';
    isAuthenticated: boolean;
}

const portalConfig: Record<string, { gradient: string; accent: string; glow: string }> = {
    CUSTOMER: {
        gradient: 'from-brand-blue to-teal-600',
        accent: 'from-brand-blue to-teal-400',
        glow: 'shadow-brand-blue/40',
    },
    ADMIN: {
        gradient: 'from-brand-teal to-blue-600',
        accent: 'from-brand-teal to-blue-400',
        glow: 'shadow-brand-teal/40',
    },
    SALES_MANAGER: {
        gradient: 'from-brand-orange to-rose-500',
        accent: 'from-brand-orange to-amber-500',
        glow: 'shadow-brand-orange/30',
    },
};

export default function LoginPage({ setToken, roleType, isAuthenticated }: LoginPageProps) {
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [testPassword, setTestPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showTestForm, setShowTestForm] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedRole = localStorage.getItem('rememberedRole');
        if (savedEmail && savedRole === roleType) {
            setTestEmail(savedEmail);
            setRememberMe(true);
        }
    }, [roleType]);

    useEffect(() => {
        const img = new Image();
        img.src = brandLogo;
        warmUpAssets(roleType);
    }, [roleType]);

    if (isAuthenticated) return <Navigate to="/" replace />;

    const cfg = portalConfig[roleType] || portalConfig.CUSTOMER;

    const subtitleMap: Record<string, string> = {
        CUSTOMER: 'Book tickets, manage reservations & track your journeys.',
        ADMIN: 'Manage your sales team, bookings & system operations.',
        SALES_MANAGER: 'Process walk-in bookings and manage your transactions.',
    };

    const handleGoogleSuccess = useCallback(async (credentialResponse: any) => {
        setIsLoggingIn(true);
        setError('');
        try {
            const data = await processGoogleAuth(credentialResponse, roleType);
            setToken(data.token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Google Authentication failed');
        } finally {
            setIsLoggingIn(false);
        }
    }, [roleType, setToken]);

    const handleTestLogin = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoggingIn(true);
        setError('');
        try {
            updateRememberMe(rememberMe, testEmail, roleType);
            const data = await processTestLogin(testEmail, testPassword);
            setToken(data.token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Test Login failed');
        } finally {
            setIsLoggingIn(false);
        }
    }, [rememberMe, testEmail, roleType, testPassword, setToken]);

    const isNative = (window as any).Capacitor?.isNativePlatform?.();

    const nativeGoogleLogin = useGoogleLogin({
        onSuccess: tokenResponse => handleGoogleSuccess(tokenResponse),
        onError: () => setError('Native Google Login Failed'),
        flow: 'implicit',
    });

    const handleLoginClick = useCallback(() => {
        if (isNative) {
            const clientId = '230918188710-1vri19r33j94uc64ohubmnbdp8mtnrk7.apps.googleusercontent.com';
            const redirectUri = 'https://ticketspro.in';
            const scope = encodeURIComponent('email profile openid');
            const state = `android_${roleType}`;
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&state=${state}`;
            Browser.open({ url: authUrl, windowName: '_system' });
        } else {
            nativeGoogleLogin();
        }
    }, [isNative, roleType, nativeGoogleLogin]);

    useEffect(() => {
        if (!isNative) return;
        const listenerPromise = App.addListener('appUrlOpen', async (event: { url: string }) => {
            const hash = event.url.split('#')[1];
            if (!hash) return;
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            if (accessToken) {
                await Browser.close();
                handleGoogleSuccess({ access_token: accessToken });
            }
        });
        return () => { listenerPromise.then(l => l.remove()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isNative]);


    return (
        <div className="h-[100dvh] w-full flex overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500">
            <style>
                {`
                @media (max-height: 850px) {
                    .login-left-panel {
                        padding: 2rem !important;
                    }
                    .login-left-logo {
                        width: 3.5rem !important;
                        height: 3.5rem !important;
                    }
                    .login-left-logo-group {
                        margin-bottom: 0.5rem !important;
                    }
                    .login-left-title {
                        font-size: 5rem !important;
                        line-height: 0.85 !important;
                        margin-bottom: 0.75rem !important;
                    }
                    .login-left-desc {
                        font-size: 1.25rem !important;
                        padding-left: 0.75rem !important;
                    }
                    .login-left-mid-block > * + * {
                        margin-top: 1rem !important;
                    }
                    .login-left-badges {
                        padding-top: 0.5rem !important;
                        gap: 0.5rem !important;
                    }
                    .login-left-badges span {
                        padding: 0.5rem 1rem !important;
                        font-size: 9px !important;
                    }
                    .login-left-stats {
                        padding-top: 1.25rem !important;
                        margin-top: 1.25rem !important;
                    }
                    .login-left-stat-val {
                        font-size: 2rem !important;
                    }
                    .login-left-stat-label {
                        font-size: 0.8rem !important;
                    }
                }
                @media (max-height: 720px) {
                    .login-left-panel {
                        padding: 1.75rem !important;
                    }
                    .login-left-logo {
                        width: 3rem !important;
                        height: 3rem !important;
                    }
                    .login-left-logo-group {
                        margin-bottom: 0.35rem !important;
                    }
                    .login-left-logo-sub {
                        display: none !important;
                    }
                    .login-left-title {
                        font-size: 4.25rem !important;
                        margin-bottom: 0.5rem !important;
                    }
                    .login-left-desc {
                        font-size: 1.15rem !important;
                        line-height: 1.3 !important;
                    }
                    .login-left-mid-block > * + * {
                        margin-top: 0.75rem !important;
                    }
                    .login-left-badges {
                        padding-top: 0.25rem !important;
                        gap: 0.35rem !important;
                    }
                    .login-left-badges span {
                        padding: 0.35rem 0.7rem !important;
                        font-size: 8px !important;
                    }
                    .login-left-stats {
                        padding-top: 1rem !important;
                        margin-top: 1rem !important;
                    }
                    .login-left-stat-val {
                        font-size: 1.75rem !important;
                    }
                    .login-left-stat-label {
                        font-size: 0.75rem !important;
                    }
                }
                @media (max-height: 640px) {
                    .login-left-panel {
                        padding: 1.25rem !important;
                    }
                    .login-left-logo {
                        width: 2.5rem !important;
                        height: 2.5rem !important;
                    }
                    .login-left-logo-group {
                        margin-bottom: 0.25rem !important;
                    }
                    .login-left-title {
                        font-size: 3.75rem !important;
                        margin-bottom: 0.25rem !important;
                    }
                    .login-left-desc {
                        font-size: 1.05rem !important;
                        line-height: 1.3 !important;
                    }
                    .login-left-mid-block > * + * {
                        margin-top: 0.5rem !important;
                    }
                    .login-left-badges {
                        display: none !important;
                    }
                    .login-left-stats {
                        padding-top: 0.75rem !important;
                        margin-top: 0.75rem !important;
                    }
                    .login-left-stat-val {
                        font-size: 1.5rem !important;
                    }
                    .login-left-stat-label {
                        font-size: 0.7rem !important;
                    }
                }
                `}
            </style>

            {/* ── LEFT PANEL – Branding ── */}
            <div className={`hidden lg:flex flex-col justify-between w-[52%] bg-gradient-to-br ${cfg.gradient} p-12 relative overflow-hidden login-left-panel`}>

                <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-2xl pointer-events-none" />

                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } }} className="relative z-10 h-full flex flex-col justify-between">
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <div className="flex items-center gap-4 mb-3 group cursor-default login-left-logo-group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <img src={brandLogo} alt="Tickets Pro" className="w-16 h-16 object-contain relative z-10 group-hover:scale-110 transition-transform duration-500 login-left-logo" />
                            </div>
                            <span className="text-white text-3xl font-black tracking-tighter italic leading-none drop-shadow-2xl">
                                Tickets <span className="text-white/40">Pro</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-2 ml-1 login-left-logo-sub">
                            <span className="h-0.5 w-8 bg-white/20 rounded-full" />
                            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.4em]">Integrated Cloud Intelligence</p>
                        </div>
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 200 } } }} className="relative z-10 space-y-8 my-auto login-left-mid-block">
                        <div>
                            <h1 className="text-[5.5rem] font-black text-white leading-[0.85] tracking-tighter mb-6 relative italic login-left-title">
                                Book<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/50 to-white/20 drop-shadow-sm">Smarter.</span>
                            </h1>
                            <p className="text-white/60 text-xl leading-relaxed max-w-sm font-medium border-l-2 border-white/10 pl-6 login-left-desc">
                                Advanced availability monitoring, instant walk-in booking, and enterprise team management in a single holographic node.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-4 login-left-badges">
                            {['Live Availability', 'Manual Provisioning', 'Multi-Wallet Control'].map(f => (
                                <motion.span whileHover={{ scale: 1.05 }} key={f} className="text-[10px] font-black uppercase tracking-widest bg-white/5 backdrop-blur-3xl text-white/80 px-5 py-2.5 rounded-2xl border border-white/10 shadow-[inner_0_1px_15px_rgba(255,255,255,0.03)] hover:bg-white/10 transition-colors cursor-default">
                                    {f}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="relative z-10 grid grid-cols-3 gap-4 pt-8 border-t border-white/20 login-left-stats">
                        {[
                            { label: 'Trains Daily', value: '13,000+' },
                            { label: 'Stations', value: '7,000+' },
                            { label: 'Bookings', value: '∞' },
                        ].map(s => (
                            <div key={s.label}>
                                <p className="text-white text-2xl font-black login-left-stat-val">{s.value}</p>
                                <p className="text-white/60 text-xs mt-0.5 login-left-stat-label">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>

            {/* ── RIGHT PANEL – High Intensity Glass Login ── */}
            <div className="flex-1 h-full relative bg-white dark:bg-slate-950 overflow-y-auto transition-colors duration-500">
                
                <div className={`absolute top-1/4 -right-1/4 w-[500px] h-[500px] bg-gradient-to-br ${cfg.gradient} opacity-10 rounded-full blur-[120px] pointer-events-none`} />
                <div className={`absolute bottom-1/4 -left-1/4 w-[400px] h-[400px] bg-teal-500 opacity-5 rounded-full blur-[100px] pointer-events-none`} />

                <div className="w-full min-h-full flex flex-col items-center justify-start py-12 px-4 sm:p-8 relative z-10">
                    <div className="w-full max-w-md my-auto flex flex-col items-center">
                        <div className="lg:hidden flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 backdrop-blur-md flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
                                <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                            </div>
                            <span className="text-slate-900 dark:text-white text-3xl font-black italic tracking-tighter transition-colors">Tickets Pro</span>
                        </div>

                        <motion.div 
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.8, ease: "circOut" }}
                            className="w-full relative z-10"
                        >
                            <div className="bg-white/95 dark:bg-slate-900/40 backdrop-blur-[40px] border border-slate-300 dark:border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-slate-300/40 dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6),inset_0_1px_20px_rgba(255,255,255,0.02)] relative overflow-hidden group">
                                
                                <div className="mb-12">
                                    <div className="flex items-center gap-3 justify-center mb-6">
                                        <span className="h-px w-8 bg-slate-200 dark:bg-white/10 shrink-0" />
                                        <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap italic">Command Access</h2>
                                        <span className="h-px w-8 bg-slate-200 dark:bg-white/10 shrink-0" />
                                    </div>
                                    <h3 className="text-5xl font-black text-slate-900 dark:text-white text-center leading-none tracking-tighter italic">
                                        Access <span className={`bg-gradient-to-r ${cfg.accent} bg-clip-text text-transparent drop-shadow-sm`}>Node</span>
                                    </h3>
                                    <p className="text-slate-400 text-center text-[10px] font-black uppercase tracking-widest mt-4 leading-relaxed max-w-[240px] mx-auto opacity-60">
                                        {subtitleMap[roleType]}
                                    </p>
                                </div>

                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-3xl text-[10px] font-black flex items-center justify-center gap-3 uppercase tracking-widest duration-300">
                                        <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="mb-10 text-center relative z-10">
                                    <motion.button
                                        whileHover={{ scale: 1.02, boxShadow: '0 25px 60px -10px rgba(0,0,0,0.15)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleLoginClick}
                                        disabled={isLoggingIn}
                                        className="flex items-center gap-4 px-10 py-5 bg-white dark:bg-white text-slate-950 font-black uppercase tracking-[0.25em] text-[10px] rounded-2.5xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-10px_rgba(255,255,255,0.1)] transition-all w-full justify-center group disabled:opacity-50 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isLoggingIn ? (
                                            <div className="w-5 h-5 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <div className="w-6 h-6 flex items-center justify-center bg-white rounded-lg overflow-hidden shrink-0 group-hover:scale-110 transition-transform duration-500">
                                               <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-full h-full object-contain" alt="G" />
                                            </div>
                                        )}
                                        <span className="relative z-10">{isLoggingIn ? 'Syncing...' : 'Continue with Google'}</span>
                                    </motion.button>
                                </div>

                                <div className="mt-4 pt-10 border-t border-slate-200 dark:border-white/5">
                                    {!showTestForm ? (
                                        <button
                                            onClick={() => setShowTestForm(true)}
                                            className="text-[10px] text-slate-500 hover:text-brand-teal font-black uppercase tracking-[0.3em] transition-colors w-full py-2"
                                        >
                                            Login with Test Credentials
                                        </button>
                                    ) : (
                                        <form onSubmit={handleTestLogin} className="space-y-4">
                                            <input
                                                type="email"
                                                placeholder="Test Email (test@ticketspro.in)"
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-brand-blue/50 outline-none transition-all font-bold"
                                            />
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Password (test1234)"
                                                    value={testPassword}
                                                    onChange={(e) => setTestPassword(e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-brand-blue/50 outline-none transition-all font-bold pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {showPassword ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <input
                                                    type="checkbox"
                                                    id="rememberMe"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-3 h-3 rounded border-slate-300 dark:border-slate-700 text-brand-blue focus:ring-brand-blue cursor-pointer"
                                                />
                                                <label htmlFor="rememberMe" className="text-[9px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                    Remember Node Access
                                                </label>
                                            </div>
                                            <div className="flex gap-4 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTestForm(false)}
                                                    className="flex-1 px-6 py-4 border border-slate-300 dark:border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                                >
                                                    Discard
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isLoggingIn}
                                                    className="flex-[2] bg-slate-100 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-700 hover:bg-slate-200 dark:hover:from-slate-700 dark:hover:to-slate-600 text-slate-900 dark:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all disabled:opacity-50 shadow-md dark:shadow-xl shadow-slate-200 dark:shadow-black/40 border border-slate-300 dark:border-white/5"
                                                >
                                                    {isLoggingIn ? 'Accessing...' : 'Override Node'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>

                            <div className="mt-12 opacity-30 group-hover:opacity-60 transition-opacity duration-700">
                                <div className="flex items-center justify-center gap-4">
                                    <div className="h-px w-10 bg-slate-800" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 whitespace-nowrap">Tickets Pro v3.5.7 · IR-INTELLIGENCE</p>
                                    <div className="h-px w-10 bg-slate-800" />
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-4">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Build v3.5.7 (STABLE)</p>
                                <a 
                                    href="https://rail-planner-api.onrender.com/downloads/tickets-pro-v3.5.7.apk" 
                                    download 
                                    className="group/btn relative inline-flex items-center justify-center transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 group-hover/btn:bg-white/10 group-hover/btn:border-white/20" />
                                    
                                    <div className="relative px-6 py-3 flex items-center gap-4">
                                        <svg viewBox="0 0 512 512" className="w-7 h-7 fill-white group-hover/btn:scale-110 transition-transform duration-500">
                                            <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
                                        </svg>
                                        <div className="text-left">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Download Android App</p>
                                            <p className="text-lg font-black text-white leading-none tracking-tight">LATEST v3.5.7</p>
                                        </div>
                                    </div>
                                </a>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Available for Android 8.0+</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
