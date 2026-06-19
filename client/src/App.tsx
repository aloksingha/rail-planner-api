import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  LayoutDashboard, Ticket, CreditCard, Settings, ShieldCheck,
  BookOpen, ReceiptText, UserCog, LogOut, Train, BadgeIndianRupee,
  Tags, Zap, Plane, Car, MessageSquare, Scale, Route as RouteIcon, Mail, AlertCircle,
  Info, RotateCcw, Megaphone, Wallet, Sun, Moon, 
  Users,
  AlertTriangle,
  History as LucideHistory,
  Bell,
  ShieldAlert,
  Percent,
  Loader2, Sparkles, CheckCircle2, X
} from 'lucide-react';

import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveBackground } from './components/InteractiveBackground';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import brandLogo from './assets/brand_logo.png';

// ✅ DIRECT IMPORTS for Absolute UI Stability
import AnnouncementPopup from './components/AnnouncementPopup';
import HotUpdateManager from './components/HotUpdateManager';

const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));

// Lazy load non-critical pages
const CustomerBookings = lazy(() => import('./pages/CustomerBookings'));
const CustomerTransactions = lazy(() => import('./pages/CustomerTransactions'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const ManualRefunds = lazy(() => import('./pages/ManualRefunds'));
const SalesOptions = lazy(() => import('./pages/SalesOptions'));
const BookingManagement = lazy(() => import('./pages/BookingManagement'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SalesBookings = lazy(() => import('./pages/SalesBookings'));
const SalesTransactions = lazy(() => import('./pages/SalesTransactions'));
const CommissionChart = lazy(() => import('./pages/CommissionChart'));
const TeamBookings = lazy(() => import('./pages/TeamBookings'));
const AdminTeam = lazy(() => import('./pages/AdminTeam'));
const PriceRequestsPage = lazy(() => import('./pages/PriceRequestsPage'));
const CorridorManagement = lazy(() => import('./pages/CorridorManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ContactInbox = lazy(() => import('./pages/ContactInbox'));
const CouponManagement = lazy(() => import('./pages/CouponManagement'));
const TicketBookingForm = lazy(() => import('./components/TicketBookingForm'));
const TicketBookingFormAndroid = lazy(() => import('./components/TicketBookingFormAndroid'));
const FlightBooking = lazy(() => import('./pages/FlightBooking'));
const CarRental = lazy(() => import('./pages/CarRental'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const ManageSettings = lazy(() => import('./pages/ManageSettings'));
const FailedBookings = lazy(() => import('./pages/FailedBookings'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const LatestUpdates = lazy(() => import('./pages/LatestUpdates'));
const WalletManagement = lazy(() => import('./pages/WalletManagement'));
const WalletDashboard = lazy(() => import('./pages/WalletDashboard'));
const AuditLogAndroid = lazy(() => import('./pages/AuditLogAndroid'));
const ManagePromotions = lazy(() => import('./pages/ManagePromotions'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-brand-teal/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-slate-400 font-medium text-sm">Loading experience...</p>
  </div>
);

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.interceptors.request.use((config) => {
  // ✅ TAB-ISOLATED AUTH: Prioritize sessionStorage (Mimic) over localStorage (Owner)
  const mimicToken = sessionStorage.getItem('mimic_token');
  const ownerToken = localStorage.getItem('token');
  const token = mimicToken || ownerToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const CACHE_VERSION = '3.1.0-STABLE-V38';

// REFINED CACHE INVALIDATION
if (typeof window !== 'undefined') {
  const lastPurge = localStorage.getItem('last_purge_v2');
  if (lastPurge !== CACHE_VERSION) {
    console.log('[SYNC] Stabilizing UI and clearing stale memory...');
    
    // Wipe Cache Storage only (preserves login)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Unregister legacy service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      });
    }

    localStorage.setItem('last_purge_v2', CACHE_VERSION);
    setTimeout(() => window.location.reload(), 500); // Small delay to let caches clear
  }
}


const ROLE_CONFIG: Record<string, { gradient: string; accent: string; badge: string; label: string; icon: any }> = {
  CUSTOMER:      { gradient: 'from-brand-teal to-brand-blue', accent: 'text-brand-teal', badge: 'bg-brand-teal/20 text-brand-teal border-brand-teal/30', label: 'Customer', icon: Train },
  SALES_MANAGER: { gradient: 'from-brand-orange to-orange-600', accent: 'text-brand-orange', badge: 'bg-brand-orange/20 text-brand-orange border-brand-orange/30', label: 'Sales Mgr', icon: Zap },
  ADMIN:         { gradient: 'from-brand-green to-emerald-600', accent: 'text-brand-green', badge: 'bg-brand-green/20 text-brand-green border-brand-green/30', label: 'Admin', icon: ShieldCheck },
  SUPER_ADMIN:   { gradient: 'from-brand-blue to-cyan-600', accent: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', label: 'Super Admin', icon: Settings },
};

interface AuthState {
  token: string | null;
  role: string | null;
  isSuperAdmin?: boolean;
  hasSpecialPermission?: boolean;
  email: string | null;
  name: string | null;
}

function NavLink({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  /* SafeIcon removed as it was unused */

  return (
    <Link
      to={to}
      className={`flex items-center gap-4 py-3 px-6 transition-all font-headline tracking-tight uppercase font-medium text-[10px] relative group
        ${isActive ? 'text-primary bg-sky-50 border-r-4 border-primary' : 'text-slate-500 hover:text-primary hover:bg-slate-50'}`}
    >
      <Icon size={18} className={isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'} />
      <span className="tracking-widest">{children}</span>
    </Link>
  );
}

function SidebarSection({ label }: { label: string }) {
  return (
    <div className="pt-6 pb-2 px-4 flex items-center gap-3">
      <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
      <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-600 font-black">{label}</p>
      <div className="h-px bg-slate-200 dark:bg-white/5 flex-1" />
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  
  // ✅ ATOMIC AUTH NODE (v3.1): Multi-Tab & Session Isolation Aware
  const [auth, setAuth] = useState<AuthState>(() => {
    // 1. Check for active mimic session in current tab (sessionStorage)
    const mimicToken = sessionStorage.getItem('mimic_token');
    if (mimicToken) {
        try {
            const decoded = jwtDecode<any>(mimicToken);
            sessionStorage.setItem('mimic_user', JSON.stringify(decoded));
            return { token: mimicToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin, hasSpecialPermission: decoded.hasSpecialPermission };
        } catch { 
            sessionStorage.removeItem('mimic_token'); 
            sessionStorage.removeItem('mimic_user');
        }
    }

    // 2. Check for fresh incoming mimic token (URL params)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
        try {
            const decoded = jwtDecode<any>(urlToken);
            // Clear stats cache to prevent cloned sessionStorage contamination from parent tab
            sessionStorage.removeItem('admin_dashboard_stats');
            sessionStorage.removeItem('admin_dashboard_activities');
            sessionStorage.removeItem('admin_dashboard_cache_time');
            // Save to sessionStorage to isolate THIS tab
            sessionStorage.setItem('mimic_token', urlToken);
            sessionStorage.setItem('mimic_user', JSON.stringify(decoded));
            // Remove the token from URL immediately to prevent re-parsing
            window.history.replaceState({}, document.title, window.location.pathname);
            return { token: urlToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin, hasSpecialPermission: decoded.hasSpecialPermission };
        } catch { /* Fail silently */ }
    }

    // 3. Fallback to global owner session (localStorage)
    const ownerToken = localStorage.getItem('token');
    if (ownerToken) {
      try {
        const decoded = jwtDecode<any>(ownerToken);
        localStorage.setItem('user', JSON.stringify(decoded));
        localStorage.setItem('user_role', decoded.role);
        return { token: ownerToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin, hasSpecialPermission: decoded.hasSpecialPermission };
      } catch { return { token: null, role: null, email: null, name: null, isSuperAdmin: false }; }
    }
    return { token: null, role: null, email: null, name: null, isSuperAdmin: false };
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (Capacitor.isNativePlatform()) {
      document.documentElement.classList.add('native-android-theme');
    }
    localStorage.setItem('theme', theme);
    if (typeof (window as any).markAppReady === 'function') {
      (window as any).markAppReady();
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (auth.token) {
        const target = `Bearer ${auth.token}`;
        if (axios.defaults.headers.common['Authorization'] !== target) {
            axios.defaults.headers.common['Authorization'] = target;
            
            // Only update localStorage if this is NOT a mimic session.
            const isMimicking = !!sessionStorage.getItem('mimic_token');
            if (!isMimicking) {
                localStorage.setItem('token', auth.token);
            }

            try {
                const decoded = jwtDecode<any>(auth.token);
                if (auth.role !== decoded.role || auth.email !== decoded.email || auth.name !== decoded.name) {
                  setAuth(prev => ({ ...prev, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin, hasSpecialPermission: decoded.hasSpecialPermission }));
                  if (!isMimicking) {
                    localStorage.setItem('user', JSON.stringify(decoded));
                  }
                }
            } catch { handleLogout(); }
        }
    } else {
        if (axios.defaults.headers.common['Authorization']) {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('user_role');
            sessionStorage.removeItem('mimic_token');
            sessionStorage.removeItem('mimic_user');
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('tp_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }
  }, [auth.token]);

  const handleLogout = () => {
    setAuth({ token: null, role: null, email: null, name: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    sessionStorage.removeItem('mimic_token');
    sessionStorage.removeItem('mimic_user');
    sessionStorage.removeItem('admin_dashboard_stats');
    sessionStorage.removeItem('admin_dashboard_activities');
    sessionStorage.removeItem('admin_dashboard_cache_time');
    delete axios.defaults.headers.common['Authorization'];
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('tp_')) {
            localStorage.removeItem(key);
        }
    });
    window.location.href = '/';
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          const isLoginRequest = error.config && error.config.url && (
            error.config.url.includes('/auth/google') || 
            error.config.url.includes('/auth/bypass')
          );
          if (!isLoginRequest) {
            console.warn('[Auth] Token invalid or expired. Logging out...');
            handleLogout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);


  const setToken = (newToken: string | null) => {
    sessionStorage.removeItem('admin_dashboard_stats');
    sessionStorage.removeItem('admin_dashboard_activities');
    sessionStorage.removeItem('admin_dashboard_cache_time');

    if (!newToken) {
      handleLogout();
      return;
    }
    try {
      const decoded = jwtDecode<any>(newToken);
      const isMimic = !!sessionStorage.getItem('mimic_token');
      
      setAuth({ token: newToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin, hasSpecialPermission: decoded.hasSpecialPermission });
      
      if (!isMimic) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(decoded));
        localStorage.setItem('user_role', decoded.role);
      } else {
        // In mimic, only set the session storage keys to keep it tab-isolated
        sessionStorage.setItem('mimic_user', JSON.stringify(decoded));
      }


    } catch { handleLogout(); }
  };

  return (
    <Router>
      <AppContent
        auth={auth}
        setToken={setToken}
        handleLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </Router>
  );
}

function AppContent({ auth, setToken, handleLogout, theme, toggleTheme }: any) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadNews, setUnreadNews] = useState(0);
  const [latestNews, setLatestNews] = useState<any>(null);
  const [pulseData, setPulseData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(auth.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const [isServerWaking, setIsServerWaking] = useState(false);

  useEffect(() => {
    let active = true;
    let checkInterval: any;

    const checkServer = async () => {
      try {
        await axios.get('/health', { timeout: 3500 });
        if (active) setIsServerWaking(false);
      } catch (err) {
        if (!active) return;
        setIsServerWaking(true);

        checkInterval = setInterval(async () => {
          try {
            await axios.get('/health', { timeout: 3500 });
            if (active) {
              setIsServerWaking(false);
              clearInterval(checkInterval);
            }
          } catch (e) {
            // Keep retrying
          }
        }, 4000);
      }
    };

    checkServer();

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  useEffect(() => {
    setEditName(auth.name || '');
  }, [auth.name]);

  const handleSaveProfile = async () => {
    setIsSavingName(true);
    setNameError('');
    try {
      const { data } = await axios.patch('/api/auth/profile', { name: editName });
      if (data.success) {
        setToken(data.token);
        setIsEditProfileOpen(false);
      }
    } catch (err: any) {
      setNameError(err.response?.data?.error || 'Failed to update name');
    } finally {
      setIsSavingName(false);
    }
  };


  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [otaStatus, setOtaStatus] = useState<{
    updateAvailable: boolean;
    remoteVersion: string;
    authorizedVersion: string;
    loading: boolean;
  }>({
    updateAvailable: false,
    remoteVersion: '',
    authorizedVersion: '',
    loading: false
  });

  const handleOtaRelease = async () => {
    if (otaStatus.loading || !otaStatus.updateAvailable) return;

    const confirmRelease = window.confirm(
      `Are you sure you want to release the latest update (${otaStatus.remoteVersion}) to all app users?\n` +
      `Current Active Version: ${otaStatus.authorizedVersion || 'None'}`
    );
    if (!confirmRelease) return;

    setOtaStatus(prev => ({ ...prev, loading: true }));
    try {
      const { data } = await axios.post('/api/settings/ota-update');
      if (data.success) {
        alert(`🚀 OTA Update released successfully! Active version is now ${data.otaVersion}`);
        setOtaStatus({
          updateAvailable: false,
          remoteVersion: otaStatus.remoteVersion,
          authorizedVersion: data.otaVersion,
          loading: false
        });
      } else {
        alert(data.error || 'Failed to release OTA update.');
        setOtaStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to release OTA update.');
      setOtaStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (auth.role !== 'SUPER_ADMIN') return;

    const checkOtaStatus = async () => {
      try {
        const remoteRes = await fetch('https://rail-planner-pro.web.app/manifest.json?t=' + Date.now());
        if (!remoteRes.ok) return;
        const remoteManifest = await remoteRes.json();
        if (!remoteManifest) return;

        const settingsRes = await axios.get('/api/settings');
        const settingsData = settingsRes.data;

        const remoteVer = remoteManifest.version || '';
        const authVer = settingsData.settings?.otaVersion || '';

        setOtaStatus({
          updateAvailable: remoteVer && authVer && remoteVer !== authVer,
          remoteVersion: remoteVer,
          authorizedVersion: authVer,
          loading: false
        });
      } catch (err) {
        console.warn('Failed to check OTA status in header', err);
      }
    };

    checkOtaStatus();
    const interval = setInterval(checkOtaStatus, 30000);
    return () => clearInterval(interval);
  }, [auth.role]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (auth.token && auth.role && auth.role !== 'SUPER_ADMIN') {
        try {
          const { data } = await axios.get('/api/wallet/history');
          setWalletBalance(data.balance || 0);
        } catch (e) {
          console.error('Failed to fetch wallet balance', e);
        }
      }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [auth.token, auth.role]);

  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);

  // Handle Global Notifications for Platform Updates
  useEffect(() => {
    const q = query(collection(db, 'platform_updates'), orderBy('updatedAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setLatestNews(data);
        const lastSeenVersion = localStorage.getItem('last_seen_platform_update');
        if (data.version && data.version !== lastSeenVersion) {
          setUnreadNews(1);
        } else {
          setUnreadNews(0);
        }
      }
    });
    return () => unsub();
  }, []);

  // Intelligence Pulse: Sync with Backend for Wallet/Tickets/PriceRequests
  useEffect(() => {
    if (!auth.token) return;
    const fetchPulse = async () => {
      try {
        const lastSeen = localStorage.getItem('last_pulse_timestamp') || new Date(0).toISOString();
        const { data } = await axios.get(`/api/notifications/pulse?lastSeen=${lastSeen}`);
        setPulseData(data);
      } catch (e) {
        console.error('Notification pulse failed', e);
      }
    };
    fetchPulse();
    const interval = setInterval(fetchPulse, 10000); // 10s heartbeat

    return () => clearInterval(interval);
  }, [auth.token]);

  const totalNotifications = unreadNews + (pulseData?.priceRequestCount || 0) + (pulseData?.ticketUpdateActive ? 1 : 0) + (pulseData?.walletUpdateActive ? 1 : 0);


  const isMimicMode = !!sessionStorage.getItem('mimic_token');

  const handleExitMimic = () => {
    sessionStorage.removeItem('mimic_token');
    sessionStorage.removeItem('mimic_user');
    sessionStorage.removeItem('admin_dashboard_stats');
    sessionStorage.removeItem('admin_dashboard_activities');
    sessionStorage.removeItem('admin_dashboard_cache_time');
    // Try to close the tab directly for a seamless experience
    window.close();
    // Fallback: If window.close() is blocked (common in some browsers if not opened via script), redirect to root
    setTimeout(() => {
        window.location.href = '/';
    }, 100);
  };

  useEffect(() => {
    if (!auth.token) return;
    let inactivityTimeout: any;
    const resetTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => { handleLogout(); }, 900000); 
    };
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [auth.token]);

  useEffect(() => {
    const setupDeepLinks = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          CapApp.addListener('appUrlOpen', (event: { url: string }) => {
            const url = new URL(event.url);
            const accessToken = url.searchParams.get('access_token');
            if (accessToken) handleLoginWithAccessToken(accessToken);
          });
        } catch (e) {
          console.warn('Capacitor App listener failed to initialize:', e);
        }
      }
    };
    const handleLoginWithAccessToken = async (accessToken: string) => {
      try {
        const { data } = await axios.post('/api/auth/google', { access_token: accessToken });
        setToken(data.token);
      } catch (e) { console.error('OAuth direct login failed', e); }
    };
    setupDeepLinks();

    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const accessToken = params.get('access_token') || hashParams.get('access_token');
    const state = params.get('state') || hashParams.get('state');
    
    if (accessToken) {
      if (state?.startsWith('android_')) {
        window.location.href = `com.ticketpro.app://login?access_token=${accessToken}`;
        return;
      }
      handleLoginWithAccessToken(accessToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [auth.token]);



  if (!auth.token || !auth.role) {
    let loginComponent = <LoginPage setToken={setToken} roleType="CUSTOMER" isAuthenticated={false} />;
    if (location.pathname === '/admin/login') {
      loginComponent = <LoginPage setToken={setToken} roleType="ADMIN" isAuthenticated={false} />;
    } else if (location.pathname === '/sales/login') {
      loginComponent = <LoginPage setToken={setToken} roleType="SALES_MANAGER" isAuthenticated={false} />;
    }

    return (
      <>
        <HotUpdateManager />
        <Suspense fallback={<PageLoader />}>{loginComponent}</Suspense>
        {isServerWaking && (
          <div className="fixed bottom-4 right-4 z-[99999] max-w-sm w-[calc(100%-2rem)] sm:w-full bg-slate-900/95 border border-slate-700/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start gap-3 text-left">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/25 shrink-0">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1 flex items-center gap-1.5">
                  Cloud Nodes Waking Up
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                </h4>
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  Tickets Pro is warming up server instances. This might take up to 45 seconds on first load. Please wait...
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  const cfg = ROLE_CONFIG[auth.role] || ROLE_CONFIG.CUSTOMER;

  return (
    <>
      <HotUpdateManager />
      <InteractiveBackground>
      {/* MIMIC SESSION ALERT BANNER */}
      {isMimicMode && (
        <div className="fixed top-0 inset-x-0 z-[5000] bg-rose-600 border-b border-rose-500 shadow-xl overflow-hidden animate-in slide-in-from-top duration-500">
           <div className="max-w-screen-2xl mx-auto px-6 h-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <AlertTriangle size={16} className="text-white animate-pulse" />
                 <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest italic leading-none">
                    Session Mimic Active: <span className="text-rose-100 opacity-80 font-mono tracking-tighter ml-1">{auth.email}</span>
                 </span>
              </div>
              <button 
                  onClick={handleExitMimic}
                  className="px-3 py-1 bg-white text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors shadow-lg"
              >
                  Terminate Session
              </button>
           </div>
        </div>
      )}

      <div className={`main-container bg-slate-50 dark:bg-slate-950 relative z-[20] w-full flex flex-col lg:flex-row overflow-hidden ${isMimicMode ? 'pt-10' : ''}`} data-theme={theme}>
        <AnimatePresence>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                          onClick={() => setIsSidebarOpen(false)} />
            )}
        </AnimatePresence>

        <aside 
          className={`flex flex-col w-64 h-[100dvh] fixed inset-y-0 left-0 bg-slate-50 dark:bg-slate-950 border-r border-slate-200/80 shadow-sm z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="px-6 py-10 flex flex-col items-center gap-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-100/40 dark:bg-slate-900/10">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-700 opacity-50"></div>
              <div className="relative w-20 h-20 rounded-[2rem] bg-white dark:bg-slate-900 flex items-center justify-center shadow-[0_12px_24px_-8px_rgba(14,165,233,0.5)] dark:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.8)] border border-slate-200 dark:border-white/10 overflow-hidden holographic-glow">
                <img src={brandLogo} alt="Logo" className="w-14 h-14 object-contain transition-all duration-700 group-hover:scale-110 group-hover:rotate-3" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-slate-900 dark:text-white font-black tracking-[-0.05em] text-2xl font-headline italic leading-none">
                TICKETS<span className="text-primary"> </span>PRO
              </h1>
              <div className="flex flex-col items-center gap-1 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
                  <p className="text-[10px] text-slate-500 dark:text-sky-400/80 font-black uppercase tracking-[0.3em] truncate max-w-[200px]" title={auth.name || auth.email || 'Node_Operator_01'}>
                    {auth.name || auth.email || 'Node_Operator_01'}
                  </p>
                </div>
                {auth.email && auth.name && (
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[180px]">{auth.email}</p>
                )}
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <SidebarSection label="Main" />
            {auth.role === 'CUSTOMER' ? (
              <NavLink to="/book-ticket" icon={Ticket}>Book Ticket</NavLink>
            ) : (
              <NavLink to="/sales/new-booking" icon={Ticket}>Book Ticket</NavLink>
            )}
            <NavLink to="/" icon={LayoutDashboard}>Dashboard</NavLink>
            
            {auth.role === 'CUSTOMER' && (
              <>
                <SidebarSection label="Travel Center" />
                <NavLink to="/bookings" icon={BookOpen}>My Bookings</NavLink>
                
                <SidebarSection label="Account" />
                <NavLink to="/wallet" icon={Wallet}>My Wallet</NavLink>
                <NavLink to="/transactions" icon={CreditCard}>Transactions</NavLink>
              </>
            )}
            {auth.role === 'SALES_MANAGER' && (
              <>
                <SidebarSection label="Sales Console" />
                <NavLink to="/sales" icon={BadgeIndianRupee}>Sales Dashboard</NavLink>
                <NavLink to="/sales/commission-chart" icon={Percent}>Commission Chart</NavLink>
                
                <SidebarSection label="Reporting" />
                <NavLink to="/sales/bookings" icon={BookOpen}>My Bookings</NavLink>
                <NavLink to="/sales/transactions" icon={ReceiptText}>My Transactions</NavLink>
                <NavLink to="/wallet" icon={Wallet}>My Wallet</NavLink>
              </>
            )}
            {auth.role === 'ADMIN' && (
              <>
                <SidebarSection label="Operations" />
                <NavLink to="/sales/team" icon={BookOpen}>Team Bookings</NavLink>
                
                <SidebarSection label="Sales" />
                <NavLink to="/sales" icon={BadgeIndianRupee}>Sales Dashboard</NavLink>
                
                <SidebarSection label="Team Mgmt" />
                <NavLink to="/admin/team" icon={Users}>Manage Team</NavLink>
                <NavLink to="/roles" icon={UserCog}>Add Sales Manager</NavLink>
                <NavLink to="/audit-logs" icon={LucideHistory}>Audit Logs</NavLink>

                <SidebarSection label="Financials" />
                <NavLink to="/wallet" icon={Wallet}>My Wallet</NavLink>
                <NavLink to="/sales/transactions" icon={ReceiptText}>My Transactions</NavLink>
                <NavLink to="/refunds" icon={Tags}>Manual Refunds</NavLink>
              </>
            )}

            {auth.hasSpecialPermission && (auth.role === 'ADMIN' || auth.role === 'SALES_MANAGER') && (
              <>
                <SidebarSection label="Special Permissions" />
                <NavLink to="/manage-promotions" icon={Sparkles}>Manage Campaigns</NavLink>
                <NavLink to="/corridors" icon={RouteIcon}>Corridor Pricing</NavLink>
                <NavLink to="/price-requests" icon={BadgeIndianRupee}>Price Requests</NavLink>
                <NavLink to="/failed-bookings" icon={AlertCircle}>Failed Bookings</NavLink>
                <NavLink to="/manage-bookings" icon={Settings}>Global Bookings</NavLink>
                <NavLink to="/admin/wallet-management" icon={Wallet}>Global Wallet</NavLink>
                <NavLink to="/coupons" icon={Tags}>Manage Coupons</NavLink>
              </>
            )}
            {auth.role === 'SUPER_ADMIN' && (
              <>
                <SidebarSection label="Live Operations" />
                <NavLink to="/price-requests" icon={BadgeIndianRupee}>
                  Price Requests 
                  {pulseData?.priceRequestCount > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                      {pulseData.priceRequestCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/failed-bookings" icon={AlertCircle}>
                  Failed Bookings
                  {pulseData?.failedBookingCount > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                      {pulseData.failedBookingCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/manage-bookings" icon={Settings}>Manage Bookings</NavLink>

                <SidebarSection label="Inventory & Pricing" />
                <NavLink to="/corridors" icon={RouteIcon}>Corridor Pricing</NavLink>
                <NavLink to="/coupons" icon={Tags}>Manage Coupons</NavLink>
                <NavLink to="/flight-booking" icon={Plane}>Flight Booking</NavLink>
                <NavLink to="/car-rental" icon={Car}>Car Rental</NavLink>

                <SidebarSection label="Internal Finance" />
                <NavLink to="/sales/transactions" icon={ReceiptText}>Platform Ledger</NavLink>
                <NavLink to="/admin/wallet-management" icon={Wallet}>
                  Manage Global Wallet
                  {pulseData?.withdrawalRequestCount > 0 && (
                    <span className="ml-auto bg-cyan-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                      {pulseData.withdrawalRequestCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/refunds" icon={Tags}>Manual Refunds</NavLink>

                <SidebarSection label="Platform Control" />
                <NavLink to="/users" icon={Users}>User Directory</NavLink>
                <NavLink to="/manage-settings" icon={Settings}>Global Settings</NavLink>
                <NavLink to="/manage-promotions" icon={Sparkles}>Manage Campaigns</NavLink>
                <NavLink to="/latest-updates" icon={Megaphone}>Platform Broadcasts</NavLink>
                <NavLink to="/inbox" icon={Mail}>Contact Inbox</NavLink>
                <NavLink to="/audit-logs" icon={LucideHistory}>Audit Logs</NavLink>
              </>
            )}


            <SidebarSection label="Information & Legal" />
            <NavLink to="/about" icon={Info}>About Us</NavLink>
            <NavLink to="/pricing" icon={Tags}>Pricing & Fees</NavLink>
            <NavLink to="/contact" icon={MessageSquare}>Contact Us</NavLink>
            <NavLink to="/terms" icon={Scale}>Terms & Conditions</NavLink>
            <NavLink to="/privacy" icon={ShieldCheck}>Privacy Policy</NavLink>
            <NavLink to="/refund-policy" icon={RotateCcw}>Refund Policy</NavLink>
          </nav>

          <div className="sidebar-footer">
            {isMimicMode && (
              <button onClick={handleExitMimic} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-600 text-white shadow-lg transition-all text-[11px] font-black uppercase tracking-widest mb-3">Terminate Mimic</button>
            )}
            <div 
              onClick={() => {
                setEditName(auth.name || '');
                setNameError('');
                setIsEditProfileOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 mb-2 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-brand-blue/30 relative group"
              title="Click to edit name"
            >
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                <span className="material-symbols-outlined text-sm">edit</span>
              </div>
              <div className={`w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden`}>
                <img src={brandLogo} alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <div className="min-w-0 pr-6">
                <p className="text-white text-xs font-semibold truncate">{auth.name || auth.email?.split('@')[0]}</p>
                {auth.email && (
                  <p className="text-[9px] text-slate-400 truncate max-w-[120px]" title={auth.email}>{auth.email}</p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
                   {isMimicMode && <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded leading-none uppercase">Mimic</span>}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn shadow-sm"><LogOut size={16} /> Sign Out</button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 w-full relative z-[25] transition-colors duration-500 bg-[#fafbfc] dark:bg-slate-950/40 h-[100dvh] overflow-y-auto">
          <header 
            className="flex justify-between items-center px-6 py-4 sticky top-0 z-40 bg-[#fafbfc]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
          >
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden hover:bg-slate-100 rounded-full p-2 text-primary active:opacity-70 transition-all">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
                  <img src={brandLogo} alt="Logo" className="w-6 h-6 object-contain transition-transform group-hover:scale-110" />
                </div>
                <h2 className="text-primary text-xl font-black italic font-headline tracking-tighter">TICKETS<span className="text-slate-400 dark:text-slate-600"> </span>PRO</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
               {isMimicMode && (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                     <AlertTriangle size={12} /> Mimic Active
                  </div>
               )}
               
              {auth.role !== 'SUPER_ADMIN' && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-xl">
                  <button 
                      onClick={() => navigate(auth.role === 'CUSTOMER' ? '/transactions' : '/sales/transactions')}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl text-slate-500 hover:text-brand-blue transition-all group"
                      title="Financial History"
                  >
                      <LucideHistory size={18} className="group-hover:rotate-[-12deg] transition-transform" />
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
                  <button 
                      onClick={() => navigate('/wallet')}
                      className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 transition-all group shrink-0"
                  >
                      <Wallet size={14} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] sm:text-[11px] font-black tracking-tight whitespace-nowrap">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-600 dark:text-slate-400 text-xs font-bold">Live</span></div>

              {auth.role === 'SUPER_ADMIN' && (
                <button
                  onClick={handleOtaRelease}
                  disabled={!otaStatus.updateAvailable || otaStatus.loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-brand uppercase tracking-wider transition-all border shadow-sm shrink-0 ${
                    otaStatus.updateAvailable
                      ? 'bg-gradient-to-r from-brand-blue to-teal-500 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] text-white border-brand-blue/30 cursor-pointer animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-white/5 cursor-not-allowed'
                  }`}
                  title={
                    otaStatus.updateAvailable
                      ? `New Update Available: ${otaStatus.remoteVersion} (Current: ${otaStatus.authorizedVersion})`
                      : `App is up to date (Active Version: ${otaStatus.authorizedVersion || 'None'})`
                  }
                >
                  {otaStatus.loading ? (
                    <>
                      <Loader2 size={10} className="animate-spin" />
                      <span>Pushing...</span>
                    </>
                  ) : otaStatus.updateAvailable ? (
                    <>
                      <Sparkles size={10} className="animate-bounce" />
                      <span>Release OTA</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={10} className="text-emerald-500" />
                      <span>OTA Up-to-Date</span>
                    </>
                  )}
                </button>
              )}
              <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (latestNews) {
                    localStorage.setItem('last_seen_platform_update', latestNews.version);
                    setUnreadNews(0);
                  }
                  if (pulseData?.timestamp) {
                    localStorage.setItem('last_pulse_timestamp', pulseData.timestamp);
                  }
                  setPulseData(null);

                  // Intelligent Navigation
                  if (auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN') {
                    if (pulseData?.priceRequestCount > 0) navigate('/price-requests');
                    else if (unreadNews > 0) navigate('/latest-updates');
                    else navigate('/manage-bookings');
                  } else {
                    if (pulseData?.ticketUpdateActive) navigate('/bookings');
                    else if (pulseData?.walletUpdateActive) navigate('/wallet');
                    else navigate('/latest-updates');
                  }
                }}
                className="relative p-2 rounded-xl text-slate-400 hover:text-brand-orange transition-all"
                title="Notifications"
              >
                <Bell size={20} className={totalNotifications > 0 ? "animate-bounce text-brand-orange" : ""} />
                {totalNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-brand-orange text-white text-[8px] font-black rounded-full border-2 border-white dark:border-slate-950 animate-pulse">
                    {totalNotifications}
                  </span>
                )}
              </button>
              <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-400 hover:text-brand-blue transition-all">
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

              <div className="hidden md:flex items-center gap-2 bg-white dark:bg-slate-900 py-1 px-3 rounded-full border border-slate-200 dark:border-white/10 shadow-sm truncate max-w-[120px]">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest">{auth.role?.split('_')[0]}</span>
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full relative z-10">
            <div className="relative">
               <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={auth.role === 'CUSTOMER' ? <CustomerDashboard /> : auth.role === 'SALES_MANAGER' ? <SalesOptions /> : <DashboardHome role={auth.role} />} />
                  <Route path="/book-ticket" element={<TicketBookingForm />} />
                  <Route path="/bookings" element={<CustomerBookings />} />
                  <Route path="/transactions" element={<CustomerTransactions />} />
                  <Route path="/roles" element={<RoleManagement />} />
                  <Route path="/sales" element={<SalesOptions />} />
                  <Route path="/sales/transactions" element={<SalesTransactions />} />
                  <Route path="/wallet" element={<WalletDashboard />} />
                  <Route path="/sales/new-booking" element={<TicketBookingForm />} />
                  <Route path="/sales/bookings" element={<SalesBookings />} />
                  <Route path="/sales/commission-chart" element={<CommissionChart />} />
                  <Route path="/sales/team" element={<TeamBookings />} />
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/manage-bookings" element={<BookingManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/price-requests" element={<PriceRequestsPage />} />
                  <Route path="/corridors" element={<CorridorManagement />} />
                  <Route path="/coupons" element={<CouponManagement />} />
                  <Route path="/inbox" element={<ContactInbox />} />
                  <Route path="/failed-bookings" element={<FailedBookings />} />
                  <Route 
                    path="/latest-updates" 
                    element={
                      auth.role === 'SUPER_ADMIN' 
                        ? <Suspense fallback={<PageLoader />}><LatestUpdates /></Suspense> 
                        : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-20 text-center"><ShieldAlert size={48} className="mx-auto text-rose-500 mb-4" /><h2 className="text-xl font-bold text-white uppercase">Access Denied</h2></motion.div>
                    } 
                  />
                  <Route path="/admin/wallet-management" element={<WalletManagement />} />
                  <Route path="/manage-settings" element={<ManageSettings />} />
                  <Route path="/manage-promotions" element={
                    auth.role === 'SUPER_ADMIN' || auth.role === 'ADMIN' || (auth.hasSpecialPermission && auth.role === 'SALES_MANAGER')
                      ? <Suspense fallback={<PageLoader />}><ManagePromotions /></Suspense>
                      : <Navigate to="/" replace />
                  } />
                  <Route path="/refunds" element={<ManualRefunds />} />
                  <Route path="/flight-booking" element={<FlightBooking />} />
                  <Route path="/car-rental" element={<CarRental />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/audit-logs" element={<AuditLogAndroid />} />
                  <Route path="/dashboard" element={<Navigate to="/" replace />} />
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  <Route path="/admin/login" element={<Navigate to="/" replace />} />
                  <Route path="/sales/login" element={<Navigate to="/" replace />} />
                  <Route path="/book-ticket-android" element={<TicketBookingFormAndroid />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      <AnnouncementPopup />
      
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex justify-center items-start animate-in fade-in duration-200">
          <div className="my-auto bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserCog size={20} className="text-brand-blue" />
                  Update Profile
                </h3>
                <p className="text-slate-400 text-xs mt-1">Change your display name in the system</p>
              </div>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {nameError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                  {nameError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={auth.email || ''}
                  className="w-full bg-slate-950/30 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Your Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 font-semibold"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800/50">
                <button
                  onClick={() => setIsEditProfileOpen(false)}
                  className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingName || !editName.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSavingName ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-sm">save</span>
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isServerWaking && (
        <div className="fixed bottom-4 right-4 z-[99999] max-w-sm w-[calc(100%-2rem)] sm:w-full bg-slate-900/95 border border-slate-700/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3 text-left">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/25 shrink-0">
              <Zap size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-white uppercase tracking-wider leading-none mb-1 flex items-center gap-1.5">
                Cloud Nodes Waking Up
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal font-sans">
                Tickets Pro is warming up server instances. This might take up to 45 seconds on first load. Please wait...
              </p>
            </div>
          </div>
        </div>
      )}
    </InteractiveBackground>
    </>
  );
}

export default function RootApp() {
  const clientId = '230918188710-1vri19r33j94uc64ohubmnbdp8mtnrk7.apps.googleusercontent.com';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  );
}

