import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  LayoutDashboard, Ticket, CreditCard, Settings, Users, ShieldCheck,
  BookOpen, ReceiptText, UserCog, LogOut, Train, BadgeIndianRupee,
  Tags, Zap, Plane, Car, MessageSquare, Scale, Route as RouteIcon, Mail, AlertCircle,
  Info, RotateCcw, Megaphone, Wallet, Sun, Moon, History as LucideHistory, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveBackground } from './components/InteractiveBackground';
import { App as CapApp } from '@capacitor/app';
import brandLogo from './assets/brand_logo.png';

// âœ… DIRECT IMPORTS for Absolute UI Stability
import DashboardHome from './pages/DashboardHome';
import CustomerDashboard from './pages/CustomerDashboard';
import AnnouncementPopup from './components/AnnouncementPopup';

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
const TeamBookings = lazy(() => import('./pages/TeamBookings'));
const AdminTeam = lazy(() => import('./pages/AdminTeam'));
const PriceRequestsPage = lazy(() => import('./pages/PriceRequestsPage'));
const CorridorManagement = lazy(() => import('./pages/CorridorManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ContactInbox = lazy(() => import('./pages/ContactInbox'));
const CouponManagement = lazy(() => import('./pages/CouponManagement'));
const TicketBookingForm = lazy(() => import('./components/TicketBookingForm'));
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

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-brand-teal/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-slate-400 font-medium text-sm">Loading experience...</p>
  </div>
);

axios.defaults.baseURL = 'https://rail-planner-api.onrender.com';
axios.interceptors.request.use((config) => {
  // âœ… TAB-ISOLATED AUTH: Prioritize sessionStorage (Mimic) over localStorage (Owner)
  const mimicToken = sessionStorage.getItem('mimic_token');
  const ownerToken = localStorage.getItem('token');
  const token = mimicToken || ownerToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const CACHE_VERSION = '3.0.5.5';

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
  email: string | null;
  name: string | null;
}

function NavLink({ to, icon: Icon, children, accent }: { to: string; icon: any; children: React.ReactNode; accent: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  const SafeIcon = () => {
    if (!Icon) return <div className="w-5 h-5 rounded-lg bg-slate-800" />;
    return (
      <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-500 ${isActive ? 'bg-slate-100 dark:bg-white/10 shadow-sm' : 'group-hover:bg-slate-50 dark:group-hover:bg-white/5'}`}>
        <Icon size={18} className={`${isActive ? accent : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'} transition-colors duration-300`} />
      </div>
    );
  };

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[13px] font-bold transition-all duration-300 group relative
        ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-pill"
          className={`absolute inset-0 rounded-2xl border transition-all duration-300 
            bg-slate-100 border-slate-300/50 shadow-sm
            dark:bg-white/[0.03] dark:border-white/5 dark:shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]
            ${accent.replace('text-', 'bg-').replace('-400', '-500')}/10 
            ${accent.replace('text-', 'border-').replace('-400', '-500')}/20`}
          initial={false}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      
      {isActive && (
        <motion.div 
          layoutId="active-indicator"
          className={`absolute left-0 w-1 h-5 rounded-r-full bg-gradient-to-b ${accent.replace('text-', 'from-').replace('-400', '-400')} to-transparent shadow-[0_0_15px_rgba(14,165,233,0.5)]`}
        />
      )}

      <div className="relative z-10 flex items-center gap-3">
        <SafeIcon />
        <span className="tracking-wide">{children}</span>
      </div>
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
  
  // âœ… ATOMIC AUTH NODE (v3.1): Multi-Tab & Session Isolation Aware
  const [auth, setAuth] = useState<AuthState>(() => {
    // 1. Check for active mimic session in current tab (sessionStorage)
    const mimicToken = sessionStorage.getItem('mimic_token');
    if (mimicToken) {
        try {
            const decoded = jwtDecode<any>(mimicToken);
            return { token: mimicToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin };
        } catch { sessionStorage.removeItem('mimic_token'); }
    }

    // 2. Check for fresh incoming mimic token (URL params)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
        try {
            const decoded = jwtDecode<any>(urlToken);
            // Save to sessionStorage to isolate THIS tab
            sessionStorage.setItem('mimic_token', urlToken);
            return { token: urlToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin };
        } catch { /* Fail silently */ }
    }

    // 3. Fallback to global owner session (localStorage)
    const ownerToken = localStorage.getItem('token');
    if (ownerToken) {
      try {
        const decoded = jwtDecode<any>(ownerToken);
        return { token: ownerToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin };
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
                  setAuth(prev => ({ ...prev, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin }));
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
            sessionStorage.removeItem('mimic_token');
        }
    }
  }, [auth.token]);

  const handleLogout = () => {
    setAuth({ token: null, role: null, email: null, name: null });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('mimic_token');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/';
  };

  const setToken = (newToken: string | null) => {
    if (!newToken) {
      handleLogout();
      return;
    }
    try {
      const decoded = jwtDecode<any>(newToken);
      const isMimic = !!sessionStorage.getItem('mimic_token');
      
      setAuth({ token: newToken, role: decoded.role, email: decoded.email, name: decoded.name, isSuperAdmin: decoded.isSuperAdmin });
      
      if (!isMimic) {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(decoded));
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);

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

  const isMimicMode = !!sessionStorage.getItem('mimic_token');

  const handleExitMimic = () => {
    sessionStorage.removeItem('mimic_token');
    // Try to close the tab directly for a seamless experience
    window.close();
    // Fallback: If window.close() is blocked (common in some browsers if not opened via script), redirect to root
    setTimeout(() => {
        window.location.href = '/';
    }, 100);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken && auth.token !== urlToken) {
      // Incoming mimic detected
      sessionStorage.setItem('mimic_token', urlToken);
      setToken(urlToken);
      window.history.replaceState({}, document.title, "/");
    }
    
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
      CapApp.addListener('appUrlOpen', (event: { url: string }) => {
        const url = new URL(event.url);
        const accessToken = url.searchParams.get('access_token');
        if (accessToken) handleLoginWithAccessToken(accessToken);
      });
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
    const urlToken = params.get('token') || hashParams.get('token');
    const accessToken = params.get('access_token') || hashParams.get('access_token');
    const state = params.get('state') || hashParams.get('state');
    
    if (urlToken) {
      setToken(urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (accessToken) {
      if (state?.startsWith('android_')) {
        window.location.href = `com.ticketpro.app://login?access_token=${accessToken}`;
        return;
      }
      handleLoginWithAccessToken(accessToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [auth.token]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (auth.role) {
        try {
          const { data } = await axios.get('/api/price-requests/notifications');
          setNotificationCount(data.count);
        } catch (e) { console.error('Failed to fetch notifications', e); }
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [auth.role]);

  if (!auth.token || !auth.role) {
    if (location.pathname === '/admin/login') return <Suspense fallback={<PageLoader />}><LoginPage setToken={setToken} roleType="ADMIN" isAuthenticated={false} /></Suspense>;
    if (location.pathname === '/sales/login') return <Suspense fallback={<PageLoader />}><LoginPage setToken={setToken} roleType="SALES_MANAGER" isAuthenticated={false} /></Suspense>;
    return <Suspense fallback={<PageLoader />}><LoginPage setToken={setToken} roleType="CUSTOMER" isAuthenticated={false} /></Suspense>;
  }

  const cfg = ROLE_CONFIG[auth.role] || ROLE_CONFIG.CUSTOMER;
  const RoleIcon = cfg.icon;

  return (
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

      <div className={`main-container bg-slate-50 dark:bg-slate-950 relative z-[20] w-full flex flex-row overflow-hidden ${isMimicMode ? 'pt-10' : ''}`} data-theme={theme}>
        <AnimatePresence>
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                          onClick={() => setIsSidebarOpen(false)} />
            )}
        </AnimatePresence>

        <aside className={`sidebar-wrapper shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="sidebar-header flex items-center gap-3">
            <img src={brandLogo} alt="Tickets Pro" className="w-12 h-12 object-contain rounded-xl shadow-lg" />
            <div>
              <p className="text-slate-900 dark:text-white font-black text-xl leading-none tracking-tight">Tickets Pro</p>
              <p className="text-brand-blue dark:text-slate-500 text-[10px] leading-none mt-1.5 font-bold uppercase tracking-widest">Global Express</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <SidebarSection label="Main" />
            <NavLink to="/" icon={LayoutDashboard} accent={cfg.accent}>Dashboard</NavLink>
            
            {auth.role === 'CUSTOMER' && (
              <><SidebarSection label="My Activity" /><NavLink to="/book-ticket" icon={Ticket} accent={cfg.accent}>Book Ticket</NavLink><NavLink to="/bookings" icon={BookOpen} accent={cfg.accent}>My Bookings</NavLink><NavLink to="/wallet" icon={Wallet} accent={cfg.accent}>My Wallet</NavLink><NavLink to="/transactions" icon={CreditCard} accent={cfg.accent}>Transactions</NavLink></>
            )}
            {auth.role === 'SALES_MANAGER' && (
              <><SidebarSection label="Sales" /><NavLink to="/sales" icon={BadgeIndianRupee} accent={cfg.accent}>Sales Dashboard</NavLink><NavLink to="/sales/new-booking" icon={Ticket} accent={cfg.accent}>Book Ticket</NavLink><NavLink to="/wallet" icon={Wallet} accent={cfg.accent}>My Wallet</NavLink><NavLink to="/sales/bookings" icon={BookOpen} accent={cfg.accent}>My Bookings</NavLink><NavLink to="/sales/transactions" icon={ReceiptText} accent={cfg.accent}>My Transactions</NavLink></>
            )}
            {auth.role === 'ADMIN' && (
              <><SidebarSection label="Sales" /><NavLink to="/sales" icon={BadgeIndianRupee} accent={cfg.accent}>Sales Dashboard</NavLink><NavLink to="/sales/new-booking" icon={Ticket} accent={cfg.accent}>Book Ticket</NavLink><NavLink to="/wallet" icon={Wallet} accent={cfg.accent}>My Wallet</NavLink><SidebarSection label="Team" /><NavLink to="/admin/team" icon={Users} accent={cfg.accent}>Manage Team</NavLink><NavLink to="/sales/team" icon={BookOpen} accent={cfg.accent}>Team Bookings</NavLink><SidebarSection label="Admin" /><NavLink to="/roles" icon={UserCog} accent={cfg.accent}>Add Sales Manager</NavLink><NavLink to="/manage-bookings" icon={Settings} accent={cfg.accent}>Manage Bookings</NavLink><NavLink to="/sales/transactions" icon={ReceiptText} accent={cfg.accent}>My Transactions</NavLink><NavLink to="/refunds" icon={Tags} accent={cfg.accent}>Manual Refunds</NavLink></>
            )}
            {auth.role === 'SUPER_ADMIN' && (
              <><SidebarSection label="Management" /><NavLink to="/manage-settings" icon={Settings} accent={cfg.accent}>Global Settings</NavLink><NavLink to="/users" icon={Users} accent={cfg.accent}>All Users</NavLink><NavLink to="/admin/wallet-management" icon={Wallet} accent={cfg.accent}>Manage Wallet</NavLink><NavLink to="/manage-bookings" icon={Settings} accent={cfg.accent}>Manage Bookings</NavLink><NavLink to="/price-requests" icon={BadgeIndianRupee} accent={cfg.accent}>Price Requests {notificationCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notificationCount}</span>}</NavLink><NavLink to="/refunds" icon={Tags} accent={cfg.accent}>Manual Refunds</NavLink><NavLink to="/corridors" icon={RouteIcon} accent={cfg.accent}>Corridor Pricing</NavLink><NavLink to="/coupons" icon={Tags} accent={cfg.accent}>Manage Coupons</NavLink><NavLink to="/inbox" icon={Mail} accent={cfg.accent}>Contact Inbox</NavLink><NavLink to="/failed-bookings" icon={AlertCircle} accent={cfg.accent}>Failed Bookings</NavLink><NavLink to="/latest-updates" icon={Megaphone} accent={cfg.accent}>Platform News</NavLink><SidebarSection label="Bookings Status" /><NavLink to="/flight-booking" icon={Plane} accent={cfg.accent}>Flight Booking</NavLink><NavLink to="/car-rental" icon={Car} accent={cfg.accent}>Car Rental</NavLink></>
            )}
            <SidebarSection label="Information & Legal" />
            <NavLink to="/about" icon={Info} accent={cfg.accent}>About Us</NavLink>
            <NavLink to="/pricing" icon={Tags} accent={cfg.accent}>Pricing & Fees</NavLink>
            <NavLink to="/contact" icon={MessageSquare} accent={cfg.accent}>Contact Us</NavLink>
            <NavLink to="/terms" icon={Scale} accent={cfg.accent}>Terms & Conditions</NavLink>
            <NavLink to="/privacy" icon={ShieldCheck} accent={cfg.accent}>Privacy Policy</NavLink>
            <NavLink to="/refund-policy" icon={RotateCcw} accent={cfg.accent}>Refund Policy</NavLink>
          </nav>

          <div className="sidebar-footer px-3 py-4">
            {isMimicMode && (
              <button onClick={handleExitMimic} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-600 text-white shadow-lg transition-all text-[11px] font-black uppercase tracking-widest mb-3">Terminate Mimic</button>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
                <RoleIcon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{auth.name || auth.email?.split('@')[0]}</p>
                <div className="flex items-center gap-1 mt-0.5">
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}>{cfg.label}</span>
                   {isMimicMode && <span className="bg-rose-500 text-white text-[8px] font-black px-1 py-0.5 rounded leading-none uppercase">Mimic</span>}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn shadow-sm"><LogOut size={16} /> Sign Out</button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 w-full relative z-[25] transition-colors duration-500 bg-slate-50/50 dark:bg-slate-950/40 h-[100dvh] overflow-y-auto">
          <header className="h-16 bg-white dark:bg-slate-950/80 border-b border-slate-300 dark:border-white/5 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-6 lg:px-8 sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-brand-teal transition-all"><LayoutDashboard size={20} /></button>
              <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-40 ml-2">v{CACHE_VERSION}</span>
              <span className="text-slate-600 text-[10px] lg:text-xs font-medium capitalize truncate max-w-[80px] lg:max-w-none">{location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace(/\//g, ' â€º ')}</span>
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
                      <span className="text-[10px] sm:text-[11px] font-black tracking-tight whitespace-nowrap">â‚¹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-600 dark:text-slate-400 text-xs font-bold">Live</span></div>
              <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-amber-500 transition-all">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
              <div className="hidden md:flex items-center gap-2 bg-surface py-1 px-3 rounded-full border border-border-main shadow-sm truncate max-w-[120px]">
                <span className="text-text-main text-[10px] font-bold uppercase">{auth.role?.split('_')[0]}</span>
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full relative z-10">
            <div className="relative">
               <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={auth.role === 'CUSTOMER' ? <CustomerDashboard /> : <DashboardHome />} />
                  <Route path="/book-ticket" element={<TicketBookingForm />} />
                  <Route path="/bookings" element={<CustomerBookings />} />
                  <Route path="/transactions" element={<CustomerTransactions />} />
                  <Route path="/roles" element={<RoleManagement />} />
                  <Route path="/sales" element={<SalesOptions />} />
                  <Route path="/sales/transactions" element={<SalesTransactions />} />
                  <Route path="/wallet" element={<WalletDashboard />} />
                  <Route path="/sales/new-booking" element={<TicketBookingForm />} />
                  <Route path="/sales/bookings" element={<SalesBookings />} />
                  <Route path="/sales/team" element={<TeamBookings />} />
                  <Route path="/admin/team" element={<AdminTeam />} />
                  <Route path="/manage-bookings" element={<BookingManagement />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/price-requests" element={<PriceRequestsPage />} />
                  <Route path="/corridors" element={<CorridorManagement />} />
                  <Route path="/coupons" element={<CouponManagement />} />
                  <Route path="/inbox" element={<ContactInbox />} />
                  <Route path="/failed-bookings" element={<FailedBookings />} />
                  <Route path="/latest-updates" element={<LatestUpdates />} />
                  <Route path="/admin/wallet-management" element={<WalletManagement />} />
                  <Route path="/manage-settings" element={<ManageSettings />} />
                  <Route path="/refunds" element={<ManualRefunds />} />
                  <Route path="/flight-booking" element={<FlightBooking />} />
                  <Route path="/car-rental" element={<CarRental />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/refund-policy" element={<RefundPolicy />} />
                  <Route path="/pricing" element={<Pricing />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      <AnnouncementPopup />
    </InteractiveBackground>
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

