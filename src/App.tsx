import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  LayoutDashboard, Ticket, CreditCard, Settings, Users, ShieldCheck,
  BookOpen, ReceiptText, UserCog, LogOut, Train, BadgeIndianRupee,
  Tags, Zap, Plane, Car, MessageSquare, Scale, Route as RouteIcon, Mail, AlertCircle,
  Info, RotateCcw
} from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import brandLogo from './assets/brand_logo.png';

// Lazy load pages for performance (Code Splitting)
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
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

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-in fade-in duration-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-brand-teal/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-slate-400 font-medium text-sm animate-pulse">Loading experience...</p>
  </div>
);



axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Per-role sidebar color accent config
const ROLE_CONFIG: Record<string, { gradient: string; accent: string; badge: string; label: string; icon: any }> = {
  CUSTOMER:      { gradient: 'from-brand-teal to-brand-blue', accent: 'text-brand-teal', badge: 'bg-brand-teal/20 text-brand-teal border-brand-teal/30', label: 'Customer', icon: Train },
  SALES_MANAGER: { gradient: 'from-brand-orange to-orange-600', accent: 'text-brand-orange', badge: 'bg-brand-orange/20 text-brand-orange border-brand-orange/30', label: 'Sales Mgr', icon: Zap },
  ADMIN:         { gradient: 'from-brand-green to-emerald-600', accent: 'text-brand-green', badge: 'bg-brand-green/20 text-brand-green border-brand-green/30', label: 'Admin', icon: ShieldCheck },
  SUPER_ADMIN:   { gradient: 'from-brand-blue to-cyan-600', accent: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', label: 'Super Admin', icon: Settings },
};

function NavLink({ to, icon: Icon, children, accent }: { to: string; icon: any; children: React.ReactNode; accent: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
        ${isActive
          ? `text-white bg-white/10 shadow-inner`
          : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
    >
      {isActive && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b ${accent.replace('text-', 'from-').replace('-400', '-400')} to-transparent`} />
      )}
      <Icon size={16} className={isActive ? accent : 'text-slate-500 group-hover:text-slate-300'} />
      {children}
    </Link>
  );
}

function SidebarSection({ label }: { label: string }) {
  return <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 font-bold px-3 mt-5 mb-1">{label}</p>;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  // ✅ FIX 1: Track auth loading state so we don't render routes before role is decoded
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);

      try {
        const decoded = jwtDecode<{ role: string; email?: string; name?: string }>(token);
        setUserRole(decoded.role);
        setUserEmail(decoded.email || 'Unknown User');
        setUserName(decoded.name || null);
      } catch {
        handleLogout();
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUserRole(null);
      setUserEmail(null);
      setUserName(null);
    }
    // ✅ FIX 1: Always mark auth as done after token is processed
    setAuthLoading(false);
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/'; // Force clear state and redirect
  };

  // ✅ FIX 2: Fixed interceptor cleanup — was incorrectly ejecting request interceptor instead of response
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    // Was: axios.interceptors.request.eject(interceptor) — WRONG
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <Router>
      <AppContent
        token={token}
        setToken={setToken}
        userRole={userRole}
        userEmail={userEmail}
        userName={userName}
        handleLogout={handleLogout}
        authLoading={authLoading}
      />
    </Router>
  );
}

function AppContent({ token, setToken, userRole, userEmail, userName, handleLogout, authLoading }: any) {
  const location = useLocation();

  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const isMimicMode = !!localStorage.getItem('original_token');

  const handleExitMimic = () => {
    const originalToken = localStorage.getItem('original_token');
    if (originalToken) {
      localStorage.removeItem('original_token');
      setToken(originalToken);
    }
  };

  const handleQuickMimic = async (role: string) => {
    try {
      const { data } = await axios.post('/api/auth/impersonate', { role });
      if (data.token) {
        localStorage.setItem('original_token', token);
        setToken(data.token);
      }
    } catch (e) {
      console.error('Quick mimic failed', e);
    }
  };

  useEffect(() => {
    // 1. Handle Deep Links (Capacitor)
    const setupDeepLinks = async () => {
      CapApp.addListener('appUrlOpen', (event: { url: string }) => {
        console.log('App opened with URL:', event.url);
        const url = new URL(event.url);
        const accessToken = url.searchParams.get('access_token');
        if (accessToken) {
          handleLoginWithAccessToken(accessToken);
        }
      });
    };

    const handleLoginWithAccessToken = async (accessToken: string) => {
      try {
        const { data } = await axios.post('/api/auth/google', { access_token: accessToken });
        setToken(data.token);
      } catch (e) {
        console.error('OAuth direct login failed', e);
      }
    };

    setupDeepLinks();

    // 2. Handle standard URL parameters (Web or Initial App Load)
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    
    const urlToken = params.get('token') || hashParams.get('token');
    const roleReq = params.get('role_request');
    const accessToken = params.get('access_token') || hashParams.get('access_token');
    const state = params.get('state') || hashParams.get('state');
    
    if (urlToken) {
      setToken(urlToken);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (accessToken) {
      if (state?.startsWith('android_')) {
        window.location.href = `com.ticketpro.app://login?access_token=${accessToken}`;
        return;
      }
      handleLoginWithAccessToken(accessToken);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (roleReq && token) {
      handleQuickMimic(roleReq);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [token]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userRole) {
        try {
          const { data } = await axios.get('/api/price-requests/notifications');
          setNotificationCount(data.count);
        } catch (e) {
          console.error('Failed to fetch notifications', e);
        }
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // ✅ FIX 1: Show loader while auth state is being resolved — prevents blank screen
  if (authLoading) {
    return <PageLoader />;
  }

  if (!token) {
    if (location.pathname === '/admin/login')
      return <LoginPage setToken={setToken} roleType="ADMIN" isAuthenticated={false} />;
    if (location.pathname === '/sales/login')
      return <LoginPage setToken={setToken} roleType="SALES_MANAGER" isAuthenticated={false} />;
    return <LoginPage setToken={setToken} roleType="CUSTOMER" isAuthenticated={false} />;
  }

  const cfg = ROLE_CONFIG[userRole] || ROLE_CONFIG.CUSTOMER;
  const RoleIcon = cfg.icon;

  return (
    <>
      {/* ── GLOBAL BACKGROUND ANIMATIONS ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[15%] left-0 text-slate-500/10 animate-fly-right">
          <Plane size={120} />
        </div>
        <div className="absolute bottom-[10%] right-0 text-slate-500/10 animate-drive-left">
          <Train size={180} />
        </div>
        <div className="absolute top-[60%] left-[10%] w-96 h-96 bg-brand-teal/5 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-brand-blue/5 rounded-full blur-[100px] animate-pulse-glow" />
      </div>

      <div className="flex h-screen overflow-hidden bg-background relative z-10 w-full">
        {/* ── MASSIVE VIBRANT LIGHT MODE BACKGROUND ── */}
        <div className="absolute inset-0 hidden data-[theme=light]:block pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-rose-500/20 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
            className="w-full h-full object-cover saturate-[2] opacity-40 mix-blend-overlay"
            alt="vibrant abstract background"
          />
        </div>

        {/* ── MOBILE SIDEBAR OVERLAY ── */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed inset-y-0 left-0 w-64 flex flex-col bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-2xl z-50 transition-transform duration-300 lg:static lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          data-[theme=light]:bg-white/10 data-[theme=light]:border-white/20 data-[theme=light]:backdrop-blur-2xl data-[theme=light]:shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        `}>

          {/* Sidebar top glow */}
          <div className={`absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br ${cfg.gradient} opacity-10 rounded-full blur-3xl pointer-events-none`} />

          {/* Logo */}
          <div className="px-6 py-8 border-b border-slate-800/80 [data-theme='light']:border-white/20">
            <div className="flex items-center gap-3">
              <img src={brandLogo} alt="Tickets Pro" className="w-12 h-12 object-contain rounded-xl shadow-lg" />
              <div>
                <p className="text-white font-black text-xl leading-none tracking-tight data-[theme=light]:text-slate-950">Tickets Pro</p>
                <p className="text-slate-500 text-[10px] leading-none mt-1.5 font-bold uppercase tracking-widest data-[theme=light]:text-indigo-600">Global Express</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            <SidebarSection label="Main" />
            <NavLink to="/" icon={LayoutDashboard} accent={cfg.accent}>Dashboard</NavLink>

            {/* Customer */}
            {userRole === 'CUSTOMER' && (
              <>
                <SidebarSection label="My Activity" />
                <NavLink to="/bookings" icon={Ticket} accent={cfg.accent}>My Bookings</NavLink>
                <NavLink to="/transactions" icon={CreditCard} accent={cfg.accent}>Transactions</NavLink>
              </>
            )}

            {/* Sales Manager */}
            {userRole === 'SALES_MANAGER' && (
              <>
                <SidebarSection label="Sales" />
                <NavLink to="/sales" icon={BadgeIndianRupee} accent={cfg.accent}>Sales Dashboard</NavLink>
                <NavLink to="/sales/new-booking" icon={Ticket} accent={cfg.accent}>Book Ticket</NavLink>
                <NavLink to="/sales/bookings" icon={BookOpen} accent={cfg.accent}>My Bookings</NavLink>
                <NavLink to="/sales/transactions" icon={ReceiptText} accent={cfg.accent}>My Transactions</NavLink>
              </>
            )}

            {/* Admin */}
            {userRole === 'ADMIN' && (
              <>
                <SidebarSection label="Sales" />
                <NavLink to="/sales" icon={BadgeIndianRupee} accent={cfg.accent}>Sales Dashboard</NavLink>
                <NavLink to="/sales/new-booking" icon={Ticket} accent={cfg.accent}>Book Ticket</NavLink>
                <SidebarSection label="Team" />
                <NavLink to="/admin/team" icon={Users} accent={cfg.accent}>Manage Team</NavLink>
                <NavLink to="/sales/team" icon={BookOpen} accent={cfg.accent}>Team Bookings</NavLink>
                <SidebarSection label="Admin" />
                <NavLink to="/roles" icon={UserCog} accent={cfg.accent}>Add Sales Manager</NavLink>
                <NavLink to="/manage-bookings" icon={Settings} accent={cfg.accent}>Manage Bookings</NavLink>
                <NavLink to="/refunds" icon={Tags} accent={cfg.accent}>Manual Refunds</NavLink>
              </>
            )}

            {/* Super Admin */}
            {userRole === 'SUPER_ADMIN' && (
              <>
                <SidebarSection label="Management" />
                <NavLink to="/manage-settings" icon={Settings} accent={cfg.accent}>Global Settings</NavLink>
                <NavLink to="/users" icon={Users} accent={cfg.accent}>All Users</NavLink>
                <NavLink to="/manage-bookings" icon={Settings} accent={cfg.accent}>Manage Bookings</NavLink>
                <NavLink to="/price-requests" icon={BadgeIndianRupee} accent={cfg.accent}>
                  Price Requests
                  {notificationCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{notificationCount}</span>}
                </NavLink>
                <NavLink to="/refunds" icon={Tags} accent={cfg.accent}>Manual Refunds</NavLink>
                <NavLink to="/corridors" icon={RouteIcon} accent={cfg.accent}>Corridor Pricing</NavLink>
                <NavLink to="/coupons" icon={Tags} accent={cfg.accent}>Manage Coupons</NavLink>
                <NavLink to="/inbox" icon={Mail} accent={cfg.accent}>Contact Inbox</NavLink>
                <NavLink to="/failed-bookings" icon={AlertCircle} accent={cfg.accent}>Failed Bookings</NavLink>
                <SidebarSection label="Bookings Status" />
                <NavLink to="/flight-booking" icon={Plane} accent={cfg.accent}>Flight Booking</NavLink>
                <NavLink to="/car-rental" icon={Car} accent={cfg.accent}>Car Rental</NavLink>
              </>
            )}

            {/* Global Information Pages */}
            <SidebarSection label="Information & Legal" />
            <NavLink to="/about" icon={Info} accent={cfg.accent}>About Us</NavLink>
            <NavLink to="/pricing" icon={Tags} accent={cfg.accent}>Pricing & Fees</NavLink>
            <NavLink to="/contact" icon={MessageSquare} accent={cfg.accent}>Contact Us</NavLink>
            <NavLink to="/terms" icon={Scale} accent={cfg.accent}>Terms & Conditions</NavLink>
            <NavLink to="/privacy" icon={ShieldCheck} accent={cfg.accent}>Privacy Policy</NavLink>
            <NavLink to="/refund-policy" icon={RotateCcw} accent={cfg.accent}>Refund Policy</NavLink>
          </nav>

          {/* User + Logout */}
          <div className="px-3 py-4 border-t border-slate-800/80">
            {isMimicMode && (
              <button
                onClick={handleExitMimic}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all text-[11px] font-black uppercase tracking-widest mb-3 group animate-pulse"
              >
                <ShieldCheck size={14} className="group-hover:scale-110 transition-transform" />
                Exit Mimic Mode
              </button>
            )}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0`}>
                <RoleIcon size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{userName || userEmail?.split('@')[0]}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.badge}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium group"
            >
              <LogOut size={15} className="group-hover:text-rose-400 text-slate-600" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-transparent backdrop-blur-[2px] data-[theme=light]:backdrop-blur-sm w-full relative z-10">
          {/* Top header bar */}
          <header className="h-16 bg-slate-900/40 border-b border-white/10 backdrop-blur-2xl flex items-center justify-between px-3 sm:px-6 lg:px-8 sticky top-0 z-30 shrink-0 data-[theme=light]:bg-white/10 data-[theme=light]:border-white/20 data-[theme=light]:shadow-sm">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hamburger Button (Mobile Only) */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-brand-teal hover:bg-slate-800/50 transition-all"
              >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                    <span className="w-full h-0.5 bg-current rounded-full" />
                    <span className="w-full h-0.5 bg-current rounded-full" />
                    <span className="w-full h-0.5 bg-current rounded-full opacity-60" />
                </div>
              </button>

              <div className="hidden min-[450px]:flex items-center gap-2">
                <span className="text-slate-600 text-[10px] lg:text-xs font-medium capitalize truncate max-w-[80px] lg:max-w-none">
                  {location.pathname === '/' ? 'Dashboard' : location.pathname.replace(/\//g, ' › ').replace(/^\s›\s/, '')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse`} />
                <span className="text-slate-400 text-[10px] sm:text-xs">Live</span>
              </div>

              <div className="h-4 w-px bg-slate-700 mx-0.5 sm:mx-1" />

              <Link
                to={userRole === 'SUPER_ADMIN' ? "/price-requests" : "/"}
                className="relative p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 rounded-xl transition-all hidden min-[500px]:block"
                title="Notifications"
              >
                <BadgeIndianRupee size={20} />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 border border-slate-900 rounded-full" />
                )}
              </Link>

              <div className="flex items-center gap-2 bg-white/5 py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-full border border-white/5 data-[theme=light]:bg-white/30 data-[theme=light]:border-white/40 data-[theme=light]:shadow-sm">
                <span className="text-slate-300 text-[10px] sm:text-xs font-medium truncate max-w-[50px] min-[400px]:max-w-[120px] data-[theme=light]:text-slate-900">
                    {userName || userEmail?.split('@')[0]}
                </span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${cfg.badge.replace('px-2.5 py-1', 'px-1.5 py-0.5')}`}>
                  {cfg.label.split(' ')[0]}
                </span>
              </div>
            </div>
          </header>

          <div className="p-4 lg:p-8 max-w-screen-2xl mx-auto w-full min-h-screen">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={userRole === 'CUSTOMER' ? <CustomerDashboard /> : <DashboardHome />} />
                {userRole === 'CUSTOMER' && <Route path="/bookings" element={<CustomerBookings />} />}
                {userRole === 'CUSTOMER' && <Route path="/transactions" element={<CustomerTransactions />} />}
                {['SUPER_ADMIN', 'ADMIN'].includes(userRole || '') && <Route path="/roles" element={<RoleManagement />} />}
                {['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(userRole || '') && <Route path="/sales" element={<SalesOptions />} />}
                {userRole === 'SALES_MANAGER' && (
                  <>
                    <Route path="/sales/bookings" element={<SalesBookings />} />
                    <Route path="/sales/transactions" element={<SalesTransactions />} />
                  </>
                )}
                {userRole === 'ADMIN' && <Route path="/sales/team" element={<TeamBookings />} />}
                {userRole === 'ADMIN' && <Route path="/admin/team" element={<AdminTeam />} />}
                {['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(userRole || '') && (
                  <Route path="/sales/new-booking" element={<TicketBookingForm />} />
                )}
                {('SUPER_ADMIN' === userRole || 'ADMIN' === userRole) && <Route path="/manage-bookings" element={<BookingManagement />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/users" element={<UserManagement />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/price-requests" element={<PriceRequestsPage />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/corridors" element={<CorridorManagement />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/coupons" element={<CouponManagement />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/inbox" element={<ContactInbox />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/failed-bookings" element={<FailedBookings />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/manage-settings" element={<ManageSettings />} />}
                {(userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && <Route path="/refunds" element={<ManualRefunds />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/flight-booking" element={<FlightBooking />} />}
                {userRole === 'SUPER_ADMIN' && <Route path="/car-rental" element={<CarRental />} />}

                <Route path="/contact" element={<ContactUs />} />
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/pricing" element={<Pricing />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
}

export default function RootApp() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  );
}
