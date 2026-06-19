import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Download, CheckCircle2, Zap, AlertTriangle, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const REMOTE_HOST = 'https://rail-planner-pro.web.app';

export default function HotUpdateManager() {
    const [status, setStatus] = useState<'idle' | 'available' | 'downloading' | 'ready' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [remoteVersion, setRemoteVersion] = useState('');
    const [manifest, setManifest] = useState<any>(null);

    const checkForUpdates = useCallback(async (isManual = false) => {
        if (!('serviceWorker' in navigator)) {
            if (isManual) alert('Service Workers are not supported on this platform.');
            return;
        }

        try {
            // Self-healing: if cache is empty, clear current_app_version to trigger clean update
            if ('caches' in window) {
                const cache = await caches.open('tickets-pro-hot-cache');
                const keys = await cache.keys();
                if (keys.length === 0) {
                    localStorage.removeItem('current_app_version');
                }
            }

            // 1. Fetch remote manifest
            const remoteRes = await fetch(`${REMOTE_HOST}/manifest.json?t=${Date.now()}`);
            if (!remoteRes.ok) {
                if (isManual) alert('Failed to fetch remote update manifest.');
                return;
            }
            const remoteManifest = await remoteRes.json();
            
            // 2. Fetch local manifest
            const localRes = await fetch('/manifest.json');
            let localVersion = 'v0';
            if (localRes.ok) {
                const localManifest = await localRes.json();
                localVersion = localManifest.version;
            }

            // 3. Resolve active version in storage (initialize on first boot)
            let activeVersion = localStorage.getItem('current_app_version');
            if (!activeVersion) {
                activeVersion = localVersion;
                localStorage.setItem('current_app_version', localVersion);
            }

            // 4. Resolve allowed OTA version from backend settings
            let otaVersion = '';
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const settingsRes = await fetch(`${API_URL}/api/settings`);
                if (settingsRes.ok) {
                    const settingsData = await settingsRes.json();
                    otaVersion = settingsData.settings?.otaVersion || '';
                }
            } catch (err) {
                console.warn('[HotUpdate] Failed to fetch otaVersion from backend:', err);
            }

            // 5. Determine if update is authorized
            // Manual update (triggered via login page version tap) bypasses setting checks to assist developers.
            // Automatic updates only prompt if the remote manifest matches the Super Admin's authorized OTA version.
            const isUpdateAuthorized = isManual || (otaVersion && remoteManifest.version === otaVersion);

            if (isUpdateAuthorized && remoteManifest.version && remoteManifest.version !== activeVersion) {
                console.log(`[HotUpdate] Update available: ${activeVersion} -> ${remoteManifest.version}`);
                setRemoteVersion(remoteManifest.version);
                setManifest(remoteManifest);
                setStatus('available');
            } else {
                if (isManual) {
                    alert(`Your app is fully up to date!\nLocal Version: ${activeVersion}\nRemote Version: ${remoteManifest.version}\nAuthorized OTA: ${otaVersion || 'None'}`);
                }
            }
        } catch (e) {
            console.warn('[HotUpdate] Failed to run update check:', e);
            if (isManual) alert('Failed to check for updates: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, []);

    useEffect(() => {
        // Check for updates on mount (with a small 2-second delay to prioritize main page load)
        const timer = setTimeout(() => {
            checkForUpdates(false);
        }, 2000);

        const handleManualCheck = () => {
            console.log('[HotUpdate] Manual update check triggered');
            checkForUpdates(true);
        };

        window.addEventListener('check-for-updates-manual', handleManualCheck);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('check-for-updates-manual', handleManualCheck);
        };
    }, [checkForUpdates]);

    const startUpdate = async () => {
        if (!manifest || !manifest.assets) return;
        setStatus('downloading');
        setProgress(0);

        try {
            const cache = await caches.open('tickets-pro-hot-cache');
            let downloaded = 0;
            const assets = manifest.assets;
            const total = assets.length;

            for (const assetPath of assets) {
                let success = false;
                let retries = 3;

                while (!success && retries > 0) {
                    try {
                        const assetRes = await fetch(`${REMOTE_HOST}${assetPath}?t=${Date.now()}`);
                        if (assetRes.ok) {
                            // Reconstruct Response to avoid "cors type response used for navigate request" or origin-mismatch security errors.
                            // Extract blob and MIME type, construct a same-origin Response without compression headers.
                            const blob = await assetRes.blob();
                            const contentType = assetRes.headers.get('Content-Type') || '';
                            
                            const cleanHeaders = new Headers();
                            if (contentType) {
                                cleanHeaders.set('Content-Type', contentType);
                            }
                            
                            const cleanRes = new Response(blob, {
                                status: assetRes.status,
                                statusText: assetRes.statusText,
                                headers: cleanHeaders
                            });

                            await cache.put(assetPath, cleanRes);
                            success = true;
                        } else {
                            retries--;
                        }
                    } catch (e) {
                        retries--;
                        if (retries === 0) throw e;
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                downloaded++;
                setProgress(Math.round((downloaded / total) * 100));
            }

            // Cache the index.html specifically under root paths
            const indexRes = await fetch(`${REMOTE_HOST}/index.html?t=${Date.now()}`);
            if (indexRes.ok) {
                const htmlText = await indexRes.text();
                
                // CRITICAL: Reconstruct Response to avoid "cors type response used for navigate request" security error.
                // Creating a new Response locally sets its type to 'default' (same-origin), which the browser permits for navigation.
                // We use a fresh Headers object containing ONLY Content-Type.
                // DO NOT copy indexRes.headers directly as they may contain Content-Encoding: gzip/br or Content-Length,
                // which will cause browser decompression or length validation failures since htmlText is an uncompressed string.
                const headers = new Headers();
                headers.set('Content-Type', 'text/html; charset=utf-8');
                
                await cache.put('/', new Response(htmlText, {
                    status: indexRes.status,
                    statusText: indexRes.statusText,
                    headers: headers
                }));
                
                await cache.put('/index.html', new Response(htmlText, {
                    status: indexRes.status,
                    statusText: indexRes.statusText,
                    headers: headers
                }));
            }

            localStorage.setItem('current_app_version', manifest.version);
            setStatus('ready');

            // Reboot application after 1.5 seconds
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('[HotUpdate] Cache update failed:', error);
            setStatus('failed');
        }
    };

    if (status === 'idle') return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-slate-900/90 border border-slate-700/50 p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_50px_rgba(14,165,233,0.15)] backdrop-blur-2xl"
                >
                    {/* Glowing Accent Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        {status === 'available' && (
                            <>
                                <div className="h-16 w-16 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(14,165,233,0.2)] animate-pulse">
                                    <Zap size={32} className="text-brand-blue" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none italic mb-2">
                                    System Upgrade Available
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                                    Version {remoteVersion}
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    A major core update has been published. Upgrade now to get the latest features, security nodes, and performance optimizations.
                                </p>
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={startUpdate}
                                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-blue to-teal-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} /> Upgrade Now
                                    </button>
                                    <button
                                        onClick={() => setStatus('idle')}
                                        className="w-full py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 text-slate-400 font-bold uppercase tracking-widest text-[10px] transition-all"
                                    >
                                        Later
                                    </button>
                                </div>
                            </>
                        )}

                        {status === 'downloading' && (
                            <>
                                <div className="h-16 w-16 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                                    <RefreshCw size={32} className="text-brand-orange animate-spin" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none italic mb-2">
                                    Downloading Assets
                                </h3>
                                <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.3em] mb-6">
                                    Do not close the application
                                </p>
                                
                                {/* Futuristic Progress Ring/Bar */}
                                <div className="w-full bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-700">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.1 }}
                                        className="h-full bg-gradient-to-r from-brand-orange to-rose-500 rounded-full"
                                    />
                                </div>
                                <div className="w-full flex justify-between text-slate-500 text-[10px] font-black tracking-widest uppercase">
                                    <span>Syncing Nodes</span>
                                    <span>{progress}%</span>
                                </div>
                            </>
                        )}

                        {status === 'ready' && (
                            <>
                                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    <CheckCircle2 size={32} className="text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none italic mb-2">
                                    Sync Complete!
                                </h3>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-6 animate-pulse">
                                    Rebooting Control Center
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Core assets successfully updated. Reloading the node to stabilize interface...
                                </p>
                            </>
                        )}

                        {status === 'failed' && (
                            <>
                                <div className="h-16 w-16 rounded-2xl bg-brand-rose/10 border border-brand-rose/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                                    <AlertTriangle size={32} className="text-brand-rose" />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight leading-none italic mb-2">
                                    Upgrade Failed
                                </h3>
                                <p className="text-[10px] font-black text-brand-rose uppercase tracking-[0.3em] mb-6">
                                    Network Disruption
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                    Could not connect to the update node. Please check your internet connectivity and try again.
                                </p>
                                <div className="flex flex-col w-full gap-3">
                                    <button
                                        onClick={startUpdate}
                                        className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={16} /> Retry Sync
                                    </button>
                                    <button
                                        onClick={() => setStatus('idle')}
                                        className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-400 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
