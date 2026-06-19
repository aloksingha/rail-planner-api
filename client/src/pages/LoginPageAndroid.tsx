import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import brandLogo from '../assets/brand_logo.png';

import { processGoogleAuth, processTestLogin, updateRememberMe, warmUpAssets } from '../utils/authUtils';

interface LoginPageAndroidProps {
    setToken: (token: string) => void;
    roleType: 'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN';
}

export default function LoginPageAndroid({ setToken, roleType }: LoginPageAndroidProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTestForm, setShowTestForm] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [testPassword, setTestPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedRole = localStorage.getItem('rememberedRole');
        if (savedEmail && savedRole === roleType) {
            setTestEmail(savedEmail);
            setRememberMe(true);
        }
        warmUpAssets(roleType);
    }, [roleType]);

    const handleTestLogin = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        try {
            updateRememberMe(rememberMe, testEmail, roleType);
            const data = await processTestLogin(testEmail, testPassword);
            setToken(data.token);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Test Login failed');
        } finally {
            setLoading(false);
        }
    }, [rememberMe, testEmail, roleType, testPassword, setToken]);

    const handleGoogleSuccess = useCallback(async (tokenResponse: any) => {
        setLoading(true);
        setError('');
        try {
            const data = await processGoogleAuth(tokenResponse, roleType);
            setToken(data.token);
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            setError(err.response?.data?.error || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    }, [roleType, setToken]);

    const handleLoginClick = useCallback(() => {
        const clientId = '230918188710-1vri19r33j94uc64ohubmnbdp8mtnrk7.apps.googleusercontent.com';
        const redirectUri = 'https://ticketspro.in';
        const scope = encodeURIComponent('email profile openid');
        const state = `android_${roleType}`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&state=${state}`;
        
        Browser.open({ url: authUrl, windowName: '_system' });
    }, [roleType]);

    useEffect(() => {
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
    }, []);


    return (
        <div className="font-body-md text-slate-900 dark:text-white h-[100dvh] relative flex flex-col items-center justify-start pt-20 pb-8 bg-slate-50 dark:bg-slate-950 overflow-y-auto w-full">
            {/* Ambient Background Layers */}
            <div className="absolute inset-0 grid-overlay pointer-events-none z-0 opacity-20 dark:opacity-100"></div>
            <div className="absolute inset-0 light-leak pointer-events-none z-0 opacity-20 dark:opacity-100"></div>
            <div className="absolute inset-0 scanline pointer-events-none z-0"></div>

            {/* Top Decorative Header */}
            <div className="absolute top-0 w-full flex justify-between items-center px-6 py-4 h-16 z-50 bg-white/30 dark:bg-slate-950/30 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                    <img src={brandLogo} alt="Logo" className="w-6 h-6 object-contain" />
                    <span className="font-label-lg text-xs text-brand-blue dark:text-sky-500 uppercase tracking-[0.2em] font-black">
                        TICKETS PRO
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="font-label-sm text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest">System Active</span>
                </div>
            </div>

            {/* Main Content Canvas */}
            <main className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 text-center mt-4">
                
                {/* Central Node / Logo */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative mb-8"
                >
                    <div className="absolute inset-0 bg-brand-blue/20 rounded-full blur-[50px]"></div>
                    <div className="relative w-28 h-28 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center holographic-glow bg-white dark:bg-slate-900/40 backdrop-blur-xl shadow-xl">
                        <img src={brandLogo} alt="Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-[-4px] rounded-full border border-transparent border-t-brand-blue/50 pointer-events-none"
                        ></motion.div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center bg-white dark:bg-slate-950">
                            <div className="w-1.5 h-1.5 bg-brand-blue rounded-full"></div>
                        </div>
                    </div>
                </motion.div>

                {/* Branding Section */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-2 mb-8"
                >
                    <h1 className="font-display-lg text-4xl text-slate-900 dark:text-white tracking-tighter uppercase flex flex-col">
                        <span className="text-brand-blue font-black drop-shadow-[0_0_15px_rgba(14,165,233,0.3)] italic">
                            {roleType === 'CUSTOMER' ? 'Tickets Pro' : 'Administrative'}
                        </span>
                        <span className="font-black text-2xl mt-1 italic text-slate-400 dark:text-slate-600">
                            {roleType === 'CUSTOMER' ? 'Login' : 'Access'}
                        </span>
                    </h1>
                    <p className="font-body-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-4 font-bold uppercase tracking-widest text-[10px]">
                        {roleType === 'CUSTOMER' 
                            ? 'Professional travel booking and management.'
                            : 'Management interface for team operations.'}
                    </p>
                </motion.div>

                {/* Action Card */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="w-full bg-white dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-sky-400/50"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-sky-400/50"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-sky-400/50"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-sky-400/50"></div>

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-[10px] font-black uppercase tracking-widest text-left">
                            Error: {error}
                        </div>
                    )}

                    <div className="mb-8 text-center relative z-10">
                        <button
                            onClick={handleLoginClick}
                            disabled={loading}
                            className="flex items-center gap-4 px-10 py-5 bg-white dark:bg-white text-slate-950 font-black uppercase tracking-[0.25em] text-[10px] rounded-2xl shadow-lg transition-all w-full justify-center group disabled:opacity-50 relative overflow-hidden"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <div className="w-6 h-6 flex items-center justify-center bg-white rounded-lg overflow-hidden shrink-0">
                                    <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-full h-full object-contain" alt="G" />
                                </div>
                            )}
                            <span className="relative z-10">{loading ? 'Syncing...' : 'Continue with Google'}</span>
                        </button>
                    </div>

                    <div className="mt-6 border-t border-slate-100 dark:border-white/5 pt-4">
                        {!showTestForm ? (
                            <button
                                onClick={() => setShowTestForm(true)}
                                className="text-[9px] text-slate-500 hover:text-brand-blue font-black uppercase tracking-[0.3em] transition-colors w-full py-2"
                            >
                                Override with Node Access
                            </button>
                        ) : (
                            <form onSubmit={handleTestLogin} className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="NODE ID / EMAIL"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-brand-blue/50 outline-none transition-all font-bold uppercase tracking-widest"
                                />
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="SECURITY KEY"
                                        value={testPassword}
                                        onChange={(e) => setTestPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-brand-blue/50 outline-none transition-all font-bold pr-10 uppercase tracking-widest"
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
                                        id="rememberMeAndroid"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3 h-3 rounded border-slate-300 dark:border-slate-700 text-brand-blue focus:ring-brand-blue cursor-pointer"
                                    />
                                    <label htmlFor="rememberMeAndroid" className="text-[9px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                        Remember Access
                                    </label>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowTestForm(false)}
                                        className="flex-1 px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] bg-brand-blue text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-brand-blue/20 px-4 py-3"
                                    >
                                        {loading ? 'SYNCING...' : 'INITIALIZE'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between px-2">
                        <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/10"></div>
                        <span className="font-label-sm text-[9px] text-slate-400 dark:text-slate-500 mx-4 uppercase font-black tracking-[0.2em]">
                            {roleType === 'CUSTOMER' ? 'Secure Login' : 'Restricted access'}
                        </span>
                        <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/10"></div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="p-3 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-left relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent"></div>
                            <span className="block font-label-sm text-[8px] text-slate-500 dark:text-slate-600 uppercase font-black tracking-widest mb-1">Security</span>
                            <span className="block font-label-lg text-[10px] text-slate-900 dark:text-white font-black uppercase">Secure SSL</span>
                        </div>
                        <div 
                            onClick={() => window.dispatchEvent(new CustomEvent('check-for-updates-manual'))}
                            className="p-3 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50 dark:bg-slate-950/40 text-left relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                        >
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-blue/50 to-transparent"></div>
                            <span className="block font-label-sm text-[8px] text-slate-500 dark:text-slate-600 uppercase font-black tracking-widest mb-1">Version</span>
                            <span className="block font-label-lg text-[10px] text-slate-900 dark:text-white font-black uppercase">v3.5.7</span>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Background Decoration Images */}
            <div className="absolute top-[20%] -left-20 w-96 h-96 opacity-10 dark:opacity-20 blur-3xl rounded-full bg-sky-500/20 z-0"></div>
            <div className="absolute bottom-[10%] -right-20 w-[30rem] h-[30rem] opacity-10 dark:opacity-20 blur-3xl rounded-full bg-blue-600/20 z-0"></div>
        </div>
    );
}
