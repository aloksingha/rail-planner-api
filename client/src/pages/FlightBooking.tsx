import { useState } from 'react';
import axios from 'axios';
import {
    Plane, Search, Calendar, ArrowRight,
    CheckCircle2, Loader2, Award,
    PlaneTakeoff, PlaneLanding, Trash2, AlertCircle, RefreshCw
} from 'lucide-react';

interface FlightResult {
    id: string;
    airline: string;
    airlineCode: string;
    flightNo: string;
    source: string;
    sourceCity: string;
    sourceCode: string;
    destination: string;
    destCity: string;
    destCode: string;
    departure: string;
    arrival: string;
    duration: string;
    stops: number;
    price: number;
    currency: string;
    priceFormatted?: string;
    seatsLeft: string | number;
    deepLink?: string;
    isRefundable?: boolean;
    isChangeable?: boolean;
    isSelfTransfer?: boolean;
    score?: number;
    tags?: string[];
    isMock?: boolean;
}

interface FlightBooking {
    id: string;
    passengerName: string;
    passengerEmail: string;
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    date: string;
    flightNo: string;
    airline: string;
    class: string;
    fare: number;
    currency: string;
    status: 'CONFIRMED' | 'CANCELLED' | 'PENDING' | 'REFUND_PROCESSING';
    createdAt: string;
}

// Airports supported by SkyScanner API (plain IATA codes)
const AIRPORTS = [
    { code: 'DEL', label: 'DEL — Delhi (Indira Gandhi)', city: 'Delhi' },
    { code: 'BOM', label: 'BOM — Mumbai (CSIA)', city: 'Mumbai' },
    { code: 'BLR', label: 'BLR — Bangalore (Kempegowda)', city: 'Bangalore' },
    { code: 'MAA', label: 'MAA — Chennai International', city: 'Chennai' },
    { code: 'HYD', label: 'HYD — Hyderabad (RGIA)', city: 'Hyderabad' },
    { code: 'CCU', label: 'CCU — Kolkata (NSCBI)', city: 'Kolkata' },
    { code: 'LHR', label: 'LHR — London Heathrow', city: 'London' },
    { code: 'DXB', label: 'DXB — Dubai International', city: 'Dubai' },
    { code: 'SIN', label: 'SIN — Singapore Changi', city: 'Singapore' },
    { code: 'BKK', label: 'BKK — Bangkok Suvarnabhumi', city: 'Bangkok' },
    { code: 'JFK', label: 'JFK — New York (JFK)', city: 'New York' },
    { code: 'LAX', label: 'LAX — Los Angeles International', city: 'Los Angeles' },
    { code: 'CDG', label: 'CDG — Paris Charles de Gaulle', city: 'Paris' },
    { code: 'AUH', label: 'AUH — Abu Dhabi International', city: 'Abu Dhabi' },
    { code: 'DOH', label: 'DOH — Doha (Hamad)', city: 'Doha' },
    { code: 'KUL', label: 'KUL — Kuala Lumpur International', city: 'Kuala Lumpur' },
    { code: 'SYD', label: 'SYD — Sydney Kingsford Smith', city: 'Sydney' },
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    REFUND_PROCESSING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const MOCK_BOOKINGS: FlightBooking[] = [
    { id: 'FBK001', passengerName: 'Ravi Kumar', passengerEmail: 'ravi@example.com', from: 'Delhi', fromCode: 'DEL', to: 'Mumbai', toCode: 'BOM', date: '2026-03-05', flightNo: 'IN205', airline: 'IndiGo', class: 'ECONOMY', fare: 4200, currency: 'INR', status: 'CONFIRMED', createdAt: '2026-02-28' },
    { id: 'FBK002', passengerName: 'Priya Sharma', passengerEmail: 'priya@example.com', from: 'Bangalore', fromCode: 'BLR', to: 'Chennai', toCode: 'MAA', date: '2026-03-08', flightNo: 'AI310', airline: 'Air India', class: 'BUSINESS', fare: 12500, currency: 'INR', status: 'PENDING', createdAt: '2026-03-01' },
    { id: 'FBK003', passengerName: 'Anil Mehta', passengerEmail: 'anil@example.com', from: 'Hyderabad', fromCode: 'HYD', to: 'Kolkata', toCode: 'CCU', date: '2026-02-20', flightNo: 'SG118', airline: 'SpiceJet', class: 'ECONOMY', fare: 3800, currency: 'INR', status: 'CANCELLED', createdAt: '2026-02-15' },
    { id: 'FBK004', passengerName: 'Sunita Patel', passengerEmail: 'sunita@example.com', from: 'Mumbai', fromCode: 'BOM', to: 'Goa', toCode: 'GOI', date: '2026-03-12', flightNo: 'UK541', airline: 'Vistara', class: 'ECONOMY', fare: 7200, currency: 'INR', status: 'CONFIRMED', createdAt: '2026-03-01' },
    { id: 'FBK005', passengerName: 'Deepak Nair', passengerEmail: 'deepak@example.com', from: 'Delhi', fromCode: 'DEL', to: 'Jaipur', toCode: 'JAI', date: '2026-02-25', flightNo: 'IN880', airline: 'IndiGo', class: 'ECONOMY', fare: 1850, currency: 'INR', status: 'REFUND_PROCESSING', createdAt: '2026-02-22' },
];

export default function FlightBooking() {
    const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');

    // Trip Type
    const [tripType, setTripType] = useState<'oneway' | 'roundtrip' | 'multicity'>('oneway');

    // Search form (Text based inputs as requested)
    const [source, setSource] = useState('DEL');
    const [destination, setDestination] = useState('BOM');
    const [date, setDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [directOnly, setDirectOnly] = useState(false);

    // Multi-city legs
    const [legs, setLegs] = useState([{ source: '', destination: '', date: '' }]);

    const [seatClass, setSeatClass] = useState('economy');
    const [adults, setAdults] = useState(1);
    const [currency, setCurrency] = useState('INR');
    const [sortBy, setSortBy] = useState('best');

    // Results
    const [searching, setSearching] = useState(false);
    const [flights, setFlights] = useState<FlightResult[]>([]);
    const [searchDone, setSearchDone] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
    const [isEstimated, setIsEstimated] = useState(false);

    // Booking form
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingPassenger, setBookingPassenger] = useState('');
    const [bookingEmail, setBookingEmail] = useState('');

    // Manage tab
    const [bookings, setBookings] = useState<FlightBooking[]>(MOCK_BOOKINGS);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    const getAirportName = (code: string) => {
        const airport = AIRPORTS.find(a => a.code.toUpperCase() === code.toUpperCase());
        return airport ? airport.label.split(' — ')[1] : null;
    };

    const handleSearch = async () => {
        if (!source || !destination || !date) return;
        setSearching(true);
        setFlights([]);
        setSearchError('');
        setSearchDone(false);
        setSelectedFlight(null);
        setShowBookingForm(false);
        try {
            const params = new URLSearchParams({
                sourceCode: source.toUpperCase(),
                destCode: destination.toUpperCase(),
                date,
                returnDate: tripType === 'roundtrip' ? returnDate : '',
                tripType,
                adults: String(adults),
                cabinClass: seatClass,
                currency,
                directOnly: String(directOnly),
                sortBy,
                limit: '20',
            });
            const res = await axios.get(`/api/flights/search?${params.toString()}`);
            if (res.data.success) {
                setFlights(res.data.data);
                setIsEstimated(!!res.data.isMock);
                if (res.data.data.length === 0) setSearchError('No flights found for this route and date.');
            } else {
                setSearchError(res.data.error || 'Failed to fetch flights.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Flight search failed.';
            setSearchError(msg);
        } finally {
            setSearching(false);
            setSearchDone(true);
        }
    };

    const addLeg = () => setLegs([...legs, { source: '', destination: '', date: '' }]);
    const removeLeg = (index: number) => setLegs(legs.filter((_, i) => i !== index));

    const handleBook = () => {
        if (!bookingPassenger || !bookingEmail) return showToast('Please fill all passenger details.', 'error');
        const flight = flights.find(f => f.id === selectedFlight);
        if (!flight) return;
        const newBooking: FlightBooking = {
            id: `FBK${Date.now().toString().slice(-5)}`,
            passengerName: bookingPassenger,
            passengerEmail: bookingEmail,
            from: flight.sourceCity,
            fromCode: flight.sourceCode,
            to: flight.destCity,
            toCode: flight.destCode,
            date,
            flightNo: flight.flightNo,
            airline: flight.airline,
            class: seatClass,
            fare: flight.price * adults,
            currency: flight.currency,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString().slice(0, 10),
        };
        setBookings(prev => [newBooking, ...prev]);
        setShowBookingForm(false);
        showToast(`✈️ Flight booked! Booking ID: ${newBooking.id} | Fare: ${flight.currency} ${(flight.price * adults).toLocaleString()}`);
        setActiveTab('manage');
        setBookingPassenger('');
        setBookingEmail('');
    };

    const handleStatusUpdate = (id: string, status: FlightBooking['status']) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
        showToast(`Booking ${id} updated to ${status}.`);
    };

    const handleDelete = (id: string) => {
        setBookings(prev => prev.filter(b => b.id !== id));
        showToast(`Booking ${id} deleted.`);
    };

    const filtered = bookings.filter(b => {
        const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
        const q = search.toLowerCase();
        return matchStatus && (!q || b.passengerName.toLowerCase().includes(q) || b.flightNo.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.airline.toLowerCase().includes(q));
    });

    const stats = {
        total: bookings.length,
        confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
        revenue: bookings.filter(b => b.status === 'CONFIRMED').reduce((s, b) => s + b.fare, 0),
    };

    const selectedFlightObj = flights.find(f => f.id === selectedFlight);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* ── HEADER BANNER ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 p-8 shadow-2xl shadow-blue-900/40">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-blue-300/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                        <Plane size={32} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-white tracking-tight">Global Flight Management</h1>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-inner group/iata hover:bg-white/20 transition-all cursor-help">
                                <Award size={14} className="text-yellow-400" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">IATA Accredited</span>
                            </div>
                        </div>
                        <p className="text-blue-200/60 mt-1 font-medium italic">Premium travel solutions with SkyScanner integration</p>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-right">
                            <p className="text-3xl font-black text-white">{stats.total}</p>
                            <p className="text-blue-200/50 text-[10px] uppercase tracking-widest">Bookings</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-emerald-300">₹{stats.revenue.toLocaleString('en-IN')}</p>
                            <p className="text-blue-200/50 text-[10px] uppercase tracking-widest">Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300">
                {[
                    { key: 'search', label: 'Search Flights', icon: Search },
                    { key: 'manage', label: 'Manage Bookings', icon: Plane },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 data-[theme=light]:bg-blue-600 data-[theme=light]:shadow-blue-500/30'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 data-[theme=light]:text-slate-600 data-[theme=light]:hover:text-slate-900 data-[theme=light]:hover:bg-slate-200'}`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── SEARCH TAB ── */}
            {activeTab === 'search' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/60 border border-slate-700/60 rounded-3xl p-7 shadow-xl backdrop-blur-sm data-[theme=light]:bg-white/95 data-[theme=light]:shadow-xl data-[theme=light]:border-slate-200">

                        {/* Trip Type Selector */}
                        <div className="flex gap-4 mb-8">
                            {[
                                { id: 'oneway', label: 'One Way' },
                                { id: 'roundtrip', label: 'Round Trip' },
                                { id: 'multicity', label: 'Multi-City' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setTripType(type.id as any)}
                                    className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${tripType === type.id
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {tripType !== 'multicity' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {/* Source */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From (Origin)</label>
                                    <div className="relative">
                                        <PlaneTakeoff size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                        <input
                                            type="text"
                                            value={source}
                                            placeholder="City or IATA (e.g. DEL)"
                                            onChange={e => setSource(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
                                        />
                                        {getAirportName(source) && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-sky-400 bg-sky-400/10 px-2 py-1 rounded-md border border-sky-400/20 animate-in fade-in zoom-in duration-300 pointer-events-none max-w-[120px] truncate">
                                                {getAirportName(source)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Destination */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To (Destination)</label>
                                    <div className="relative">
                                        <PlaneLanding size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                        <input
                                            type="text"
                                            value={destination}
                                            placeholder="City or IATA (e.g. BOM)"
                                            onChange={e => setDestination(e.target.value.toUpperCase())}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500 placeholder:text-slate-600"
                                        />
                                        {getAirportName(destination) && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20 animate-in fade-in zoom-in duration-300 pointer-events-none max-w-[120px] truncate">
                                                {getAirportName(destination)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Outbound Date */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departure Date</label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                        <input
                                            type="date"
                                            value={date}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-3 py-3 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Return Date */}
                                <div className={`space-y-1.5 transition-all duration-300 ${tripType === 'roundtrip' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Return Date</label>
                                    <div className="relative">
                                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                        <input
                                            type="date"
                                            disabled={tripType !== 'roundtrip'}
                                            value={returnDate}
                                            min={date || new Date().toISOString().split('T')[0]}
                                            onChange={e => setReturnDate(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-3 py-3 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Multi-City Legs Binding */
                            <div className="space-y-4 mb-6">
                                {legs.map((leg, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-slate-800/20 p-4 rounded-2xl border border-slate-700/50 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                                        <div className="space-y-1.5 relative">
                                            <label className="text-[9px] font-black text-slate-500 uppercase data-[theme=light]:text-slate-600">From</label>
                                            <input
                                                type="text"
                                                placeholder="Origin"
                                                value={leg.source}
                                                onChange={e => {
                                                    const nl = [...legs];
                                                    nl[idx].source = e.target.value.toUpperCase();
                                                    setLegs(nl);
                                                }}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 pr-10 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                            />
                                            {getAirportName(leg.source) && (
                                                <div className="absolute right-2 bottom-2 text-[8px] font-black text-sky-400 bg-sky-400/5 px-1.5 py-0.5 rounded border border-sky-400/10 pointer-events-none max-w-[60px] truncate data-[theme=light]:text-blue-600 data-[theme=light]:bg-blue-50 data-[theme=light]:border-blue-200">
                                                    {getAirportName(leg.source)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 relative">
                                            <label className="text-[9px] font-black text-slate-500 uppercase data-[theme=light]:text-slate-600">To</label>
                                            <input
                                                type="text"
                                                placeholder="Destination"
                                                value={leg.destination}
                                                onChange={e => {
                                                    const nl = [...legs];
                                                    nl[idx].destination = e.target.value.toUpperCase();
                                                    setLegs(nl);
                                                }}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 pr-10 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                            />
                                            {getAirportName(leg.destination) && (
                                                <div className="absolute right-2 bottom-2 text-[8px] font-black text-emerald-400 bg-emerald-400/5 px-1.5 py-0.5 rounded border border-emerald-400/10 pointer-events-none max-w-[60px] truncate data-[theme=light]:text-emerald-700 data-[theme=light]:bg-emerald-50 data-[theme=light]:border-emerald-200">
                                                    {getAirportName(leg.destination)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-slate-500 uppercase data-[theme=light]:text-slate-600">Date</label>
                                            <input
                                                type="date"
                                                value={leg.date}
                                                onChange={e => {
                                                    const nl = [...legs];
                                                    nl[idx].date = e.target.value;
                                                    setLegs(nl);
                                                }}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-xs text-white [color-scheme:dark] outline-none focus:border-blue-500 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 [&::-webkit-calendar-picker-indicator]:data-[theme=light]:filter-none"
                                            />
                                        </div>
                                        <div className="flex gap-2 mb-1.5">
                                            {idx > 0 && (
                                                <button onClick={() => removeLeg(idx)} className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all data-[theme=light]:text-rose-500 data-[theme=light]:hover:bg-rose-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addLeg} className="text-xs font-black text-blue-400 hover:text-blue-200 px-2 py-1 flex items-center gap-1 transition-colors data-[theme=light]:text-blue-600 data-[theme=light]:hover:text-blue-800">
                                    + Add another destination
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Class */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Class</label>
                                <select value={seatClass} onChange={e => setSeatClass(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white transition-all focus:border-blue-500 outline-none data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 cursor-pointer">
                                    <option value="economy">Economy</option>
                                    <option value="business">Business</option>
                                    <option value="first">First</option>
                                </select>
                            </div>

                            {/* Adults */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Adults</label>
                                <input type="number" min={1} value={adults} onChange={e => setAdults(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white transition-all focus:border-blue-500 outline-none data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900" />
                            </div>

                            {/* Currency */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Currency</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white transition-all focus:border-blue-500 outline-none data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 cursor-pointer">
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Direct Only */}
                            <div className="flex items-end pb-3">
                                <label className="flex items-center gap-2.5 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${directOnly ? 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)] data-[theme=light]:bg-blue-600 data-[theme=light]:border-blue-500 data-[theme=light]:shadow-blue-200' : 'border-slate-600 group-hover:border-slate-500 data-[theme=light]:border-slate-300 data-[theme=light]:group-hover:border-slate-400'}`}>
                                        {directOnly && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={directOnly} onChange={e => setDirectOnly(e.target.checked)} />
                                    <span className="text-xs font-black text-slate-400 group-hover:text-slate-300 transition-colors data-[theme=light]:text-slate-600 data-[theme=light]:group-hover:text-slate-800">Direct Flights Only</span>
                                </label>
                            </div>
                        </div>

                        {/* Search Action */}
                        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50 gap-4 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                            <div className="flex gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none data-[theme=light]:text-slate-600">Filters active</p>
                                    <div className="flex gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-black transition-all ${directOnly ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 data-[theme=light]:bg-blue-100 data-[theme=light]:text-blue-600 data-[theme=light]:border-blue-300' : 'bg-slate-700/50 text-slate-500 border-slate-700 data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-600 data-[theme=light]:border-slate-300'}`}>Direct</span>
                                        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase font-black data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-700">{seatClass}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={searching}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-12 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl shadow-xl shadow-blue-900/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 data-[theme=light]:shadow-blue-500/30"
                            >
                                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                {searching ? 'Searching Flights...' : 'Search Available Flights'}
                            </button>
                        </div>
                    </div>

                    {/* Results Loading */}
                    {searching && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20">
                                <Plane size={32} className="text-blue-400 animate-bounce" />
                            </div>
                            <h3 className="text-xl font-black text-white">Finding the best deals...</h3>
                            <p className="text-slate-500 text-sm">Searching real-time fares for your {tripType} trip</p>
                        </div>
                    )}

                    {/* Results Sort & Filter Buttons */}
                    {flights.length > 0 && !searching && (
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800 scale-in-sm duration-300 data-[theme=light]:bg-slate-50 data-[theme=light]:border-slate-200">
                            <div className="flex items-center gap-2">
                                <h3 className="text-white font-black text-lg data-[theme=light]:text-slate-900">Found {flights.length} results</h3>
                                {isEstimated && <span className="text-[9px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/20 font-black tracking-widest uppercase data-[theme=light]:bg-sky-100 data-[theme=light]:border-sky-200 data-[theme=light]:text-sky-700">Estimated Prices</span>}
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-black tracking-widest uppercase data-[theme=light]:bg-blue-100 data-[theme=light]:border-blue-200 data-[theme=light]:text-blue-700">{tripType}</span>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-1 data-[theme=light]:text-slate-600">Sort By:</span>
                                {[
                                    { id: 'best', label: 'Recommended' },
                                    { id: 'price', label: 'Cheapest' },
                                    { id: 'fastest', label: 'Fastest' }
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setSortBy(s.id); handleSearch(); }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all border ${sortBy === s.id
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/40 scale-105 data-[theme=light]:shadow-blue-500/30'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 data-[theme=light]:bg-slate-200 data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-600 data-[theme=light]:hover:bg-slate-300 data-[theme=light]:hover:text-slate-900'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                                <div className="h-6 w-px bg-slate-700 mx-2 data-[theme=light]:bg-slate-300" />
                                <button className="px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-700 transition-all flex items-center gap-2 data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-700 data-[theme=light]:border-slate-300 data-[theme=light]:hover:bg-slate-300">
                                    <RefreshCw size={12} /> Filters
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {searchError && searchDone && !searching && (
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 text-center space-y-3">
                            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500 leading-none">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-white font-black">Something went wrong</h3>
                            <p className="text-rose-400/60 text-sm max-w-md mx-auto">{searchError}</p>
                            <button onClick={handleSearch} className="px-6 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition-all">
                                Try Again
                            </button>
                        </div>
                    )}

                    {searchError && searchDone && !searching && (
                        <div className="flex items-center gap-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
                            <AlertCircle size={20} className="text-rose-400 shrink-0" />
                            <div>
                                <p className="text-rose-300 font-bold">Flight Search Failed</p>
                                <p className="text-rose-400/60 text-sm">{searchError}</p>
                            </div>
                            <button onClick={handleSearch} className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition-all">
                                <RefreshCw size={12} /> Retry
                            </button>
                        </div>
                    )}

                    {searchDone && !searching && flights.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-black text-lg flex items-center gap-2 flex-wrap data-[theme=light]:text-slate-900">
                                    <Plane size={18} className="text-sky-400 data-[theme=light]:text-sky-600" />
                                    {flights.length} Flights Found
                                    <span className="text-xs text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full data-[theme=light]:bg-sky-100 data-[theme=light]:text-sky-700 data-[theme=light]:border-sky-300">{seatClass}</span>
                                    <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-600 data-[theme=light]:border-slate-300">
                                        {AIRPORTS.find(a => a.code === source)?.city} → {AIRPORTS.find(a => a.code === destination)?.city}
                                    </span>
                                </h3>
                            </div>

                            {flights.map(f => {
                                const isSelected = selectedFlight === f.id;
                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => { setSelectedFlight(f.id); setShowBookingForm(true); }}
                                        className={`group relative border rounded-2xl p-5 cursor-pointer transition-all duration-300 ${isSelected
                                            ? 'border-sky-500 bg-sky-500/5 shadow-lg shadow-sky-900/20 data-[theme=light]:bg-sky-50 data-[theme=light]:shadow-sky-500/20'
                                            : 'bg-slate-900/70 border-slate-700/60 hover:border-sky-500/40 hover:bg-slate-900/90 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:hover:bg-slate-50'}`}
                                    >
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                                            {/* Airline */}
                                            <div className="w-40 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-blue-700 rounded-xl flex items-center justify-center shadow shrink-0">
                                                        <Plane size={16} className="text-white" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm leading-tight truncate data-[theme=light]:text-slate-900">{f.airline}</p>
                                                        <p className="text-slate-500 text-[10px] font-bold data-[theme=light]:text-slate-600">{f.flightNo || f.airlineCode}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Route */}
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="text-center">
                                                    <p className="text-xl font-black text-white data-[theme=light]:text-slate-900">{f.departure}</p>
                                                    <p className="text-[10px] text-sky-400 font-black data-[theme=light]:text-sky-600">{f.sourceCode}</p>
                                                    <p className="text-[10px] text-slate-500 truncate max-w-20 data-[theme=light]:text-slate-600">{f.sourceCity}</p>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center gap-1 px-2">
                                                    <p className="text-[10px] text-slate-500 font-bold data-[theme=light]:text-slate-600">{f.duration}</p>
                                                    <div className="w-full flex items-center gap-1">
                                                        <div className="flex-1 h-px bg-slate-700 data-[theme=light]:bg-slate-300" />
                                                        <Plane size={12} className="text-sky-400 data-[theme=light]:text-sky-600" style={{ transform: 'rotate(45deg)' }} />
                                                        <div className="flex-1 h-px bg-slate-700 data-[theme=light]:bg-slate-300" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-600 font-bold data-[theme=light]:text-slate-500">
                                                        {f.stops === 0 ? 'Non-stop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xl font-black text-white data-[theme=light]:text-slate-900">{f.arrival}</p>
                                                    <p className="text-[10px] text-emerald-400 font-black data-[theme=light]:text-emerald-600">{f.destCode}</p>
                                                    <p className="text-[10px] text-slate-500 truncate max-w-20 data-[theme=light]:text-slate-600">{f.destCity}</p>
                                                </div>
                                            </div>

                                            {/* Seats */}
                                            {f.seatsLeft !== '—' && (
                                                <div className="hidden md:flex flex-col items-center">
                                                    <p className="text-[10px] text-rose-400 font-black data-[theme=light]:text-rose-600">{f.seatsLeft} seats left</p>
                                                </div>
                                            )}

                                            {/* Price + CTA*/}
                                            <div className="md:ml-auto flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-white data-[theme=light]:text-slate-900">
                                                        {f.currency} {(tripType === 'roundtrip' ? Math.round(f.price / 2) : f.price).toLocaleString('en-IN')}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-bold data-[theme=light]:text-slate-600">
                                                        per person · one-way
                                                        {tripType === 'roundtrip' && (
                                                            <>
                                                                <span className="block text-sky-400/80 data-[theme=light]:text-sky-600">
                                                                    Round-trip: {f.currency} {f.price.toLocaleString('en-IN')}
                                                                </span>
                                                                {adults > 1 && (
                                                                    <span className="block text-slate-400 data-[theme=light]:text-slate-600">
                                                                        Total ({adults} pax): {f.currency} {(f.price * adults).toLocaleString('en-IN')}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {tripType !== 'roundtrip' && adults > 1 && (
                                                            <span className="block text-slate-400 data-[theme=light]:text-slate-600">
                                                                Total: {f.currency} {(f.price * adults).toLocaleString('en-IN')}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFlight(f.id); setShowBookingForm(true); }}
                                                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-xl shadow-lg shadow-sky-900/20 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap data-[theme=light]:shadow-sky-500/30"
                                                >
                                                    BOOK NOW
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Booking form */}
                            {showBookingForm && selectedFlightObj && (
                                <div className="bg-slate-900/80 border border-sky-500/30 rounded-3xl p-7 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 data-[theme=light]:bg-white data-[theme=light]:border-slate-200 data-[theme=light]:shadow-xl">
                                    <h3 className="text-white font-black text-lg mb-1 flex items-center gap-2 data-[theme=light]:text-slate-900">
                                        <CheckCircle2 size={20} className="text-sky-400 data-[theme=light]:text-sky-600" />
                                        Confirm Booking
                                    </h3>
                                    <p className="text-slate-400 text-xs mb-5 data-[theme=light]:text-slate-600">{selectedFlightObj.airline} · {selectedFlightObj.sourceCity} → {selectedFlightObj.destCity}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 data-[theme=light]:text-slate-600">Passenger Full Name *</label>
                                            <input
                                                type="text"
                                                placeholder="Enter passenger name"
                                                value={bookingPassenger}
                                                onChange={e => setBookingPassenger(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-sky-500 placeholder-slate-600 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 data-[theme=light]:placeholder-slate-400"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 data-[theme=light]:text-slate-600">Passenger Email *</label>
                                            <input
                                                type="email"
                                                placeholder="Enter passenger email"
                                                value={bookingEmail}
                                                onChange={e => setBookingEmail(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-sky-500 placeholder-slate-600 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 data-[theme=light]:placeholder-slate-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Fare summary */}
                                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4 data-[theme=light]:bg-blue-50 data-[theme=light]:border-blue-200">
                                        {[
                                            { label: 'Route', val: `${selectedFlightObj.sourceCode} → ${selectedFlightObj.destCode}` },
                                            { label: 'Date', val: date },
                                            { label: 'Class', val: seatClass },
                                            { label: 'Total Fare', val: `${selectedFlightObj.currency} ${(selectedFlightObj.price * adults).toLocaleString()}` },
                                        ].map(item => (
                                            <div key={item.label}>
                                                <p className="text-sky-400/60 text-[10px] font-bold uppercase data-[theme=light]:text-blue-600">{item.label}</p>
                                                <p className="text-white font-black text-sm data-[theme=light]:text-slate-900">{item.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => { setShowBookingForm(false); setSelectedFlight(null); }}
                                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black rounded-xl data-[theme=light]:bg-slate-200 data-[theme=light]:text-slate-700 data-[theme=light]:hover:bg-slate-300">
                                            CANCEL
                                        </button>
                                        <button onClick={handleBook}
                                            className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-sm font-black rounded-xl shadow-lg flex items-center justify-center gap-2 data-[theme=light]:shadow-blue-500/30">
                                            <CheckCircle2 size={16} /> CONFIRM &amp; BOOK FLIGHT
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── MANAGE TAB ── */}
            {activeTab === 'manage' && (
                <div className="space-y-5">
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 data-[theme=light]:text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, flight, booking ID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-sky-500 placeholder-slate-600 data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 data-[theme=light]:placeholder-slate-400"
                            />
                        </div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex-wrap data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-200">
                            {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED', 'REFUND_PROCESSING'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${statusFilter === s ? 'bg-sky-600 text-white shadow data-[theme=light]:bg-sky-500 data-[theme=light]:text-white data-[theme=light]:shadow-md' : 'text-slate-400 hover:text-white data-[theme=light]:text-slate-600 data-[theme=light]:hover:text-slate-900'}`}
                                >
                                    {s === 'REFUND_PROCESSING' ? 'REFUND' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl data-[theme=light]:bg-white/95 data-[theme=light]:border-slate-200 data-[theme=light]:shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800 data-[theme=light]:border-slate-200 data-[theme=light]:bg-slate-50">
                                        {['Booking ID', 'Passenger', 'Route', 'Date', 'Flight', 'Class', 'Fare', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap data-[theme=light]:text-slate-600">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-16 text-slate-500 data-[theme=light]:text-slate-400">
                                                <Plane size={32} className="mx-auto mb-3 opacity-30" />
                                                <p className="font-bold">No bookings found</p>
                                            </td>
                                        </tr>
                                    ) : filtered.map((b, i) => (
                                        <tr key={b.id} className={`border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors data-[theme=light]:border-slate-200 data-[theme=light]:hover:bg-slate-50 ${i % 2 ? 'bg-white/[0.01] data-[theme=light]:bg-slate-50/50' : 'data-[theme=light]:bg-white'}`}>
                                            <td className="px-4 py-4"><span className="text-xs font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded data-[theme=light]:text-blue-600 data-[theme=light]:bg-blue-100">{b.id}</span></td>
                                            <td className="px-4 py-4">
                                                <p className="text-white font-semibold text-sm data-[theme=light]:text-slate-900">{b.passengerName}</p>
                                                <p className="text-slate-500 text-xs data-[theme=light]:text-slate-500">{b.passengerEmail}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-white font-bold whitespace-nowrap data-[theme=light]:text-slate-800">
                                                    <PlaneTakeoff size={11} className="text-sky-400 data-[theme=light]:text-sky-500" />
                                                    {b.fromCode || b.from}
                                                    <ArrowRight size={11} className="text-slate-600 data-[theme=light]:text-slate-400" />
                                                    <PlaneLanding size={11} className="text-emerald-400 data-[theme=light]:text-emerald-500" />
                                                    {b.toCode || b.to}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap data-[theme=light]:text-slate-600">{b.date}</td>
                                            <td className="px-4 py-4">
                                                <p className="text-white text-xs font-bold data-[theme=light]:text-slate-900">{b.flightNo}</p>
                                                <p className="text-slate-500 text-[10px] data-[theme=light]:text-slate-500">{b.airline}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full whitespace-nowrap data-[theme=light]:text-indigo-600 data-[theme=light]:bg-indigo-100 data-[theme=light]:border-indigo-200">{b.class}</span>
                                            </td>
                                            <td className="px-4 py-4 text-white font-black text-sm whitespace-nowrap data-[theme=light]:text-slate-900">
                                                {b.currency || 'INR'} {b.fare.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-fit ${STATUS_COLORS[b.status]} data-[theme=light]:${STATUS_COLORS[b.status].replace('text-', 'data-[theme=light]:text-').replace('bg-', 'data-[theme=light]:bg-').replace('border-', 'data-[theme=light]:border-')}`}>
                                                        {b.status === 'REFUND_PROCESSING' ? 'REFUND' : b.status}
                                                    </span>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {(['CONFIRMED', 'PENDING', 'CANCELLED'] as const).filter(s => s !== b.status).map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => handleStatusUpdate(b.id, s)}
                                                                className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-600 data-[theme=light]:hover:bg-slate-200 data-[theme=light]:hover:text-slate-900"
                                                            >
                                                                → {s.slice(0, 4)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => handleDelete(b.id)}
                                                    className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition-all data-[theme=light]:bg-rose-100 data-[theme=light]:border-rose-200 data-[theme=light]:text-rose-500 data-[theme=light]:hover:bg-rose-200"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-3xl shadow-2xl border backdrop-blur-xl text-sm font-black animate-in slide-in-from-bottom-8 duration-500 max-w-md
                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/90 border-rose-500/40 text-rose-300'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
