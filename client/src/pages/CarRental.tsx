import { useState } from 'react';
import axios from 'axios';
import {
    Car, Search, Calendar, MapPin, Users, Fuel,
    Wind, Settings2, CheckCircle2, Loader2,
    AlertCircle, RefreshCw, Trash2, ArrowRight,
    Star, Shield
} from 'lucide-react';

interface CarResult {
    id: string;
    name: string;
    category: string;
    seats: string | number;
    doors: string | number;
    transmission: string;
    fuelType: string;
    aircon: boolean;
    imageUrl: string;
    basePrice: number;
    totalPrice: number;
    pricePerDay: number;
    currency: string;
    supplier: string;
    supplierLogo: string;
    rating: number | null;
    reviewCount: number | null;
    freeCancellation: boolean;
    days: number;
}

interface CarBooking {
    id: string;
    passengerName: string;
    passengerEmail: string;
    carName: string;
    category: string;
    supplier: string;
    pickupLocation: string;
    pickupDate: string;
    dropoffDate: string;
    totalPrice: number;
    currency: string;
    status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'REFUND_PROCESSING';
    createdAt: string;
}

// Popular locations with coordinates
const LOCATIONS = [
    { label: 'New York (JFK)', lat: '40.6397018432617', lng: '-73.7791976928711', loc: 'US', currency: 'USD' },
    { label: 'London (Heathrow)', lat: '51.4775', lng: '-0.4614', loc: 'GB', currency: 'GBP' },
    { label: 'Dubai (DXB)', lat: '25.2532', lng: '55.3657', loc: 'AE', currency: 'USD' },
    { label: 'Mumbai (BOM)', lat: '19.0896', lng: '72.8656', loc: 'IN', currency: 'INR' },
    { label: 'Delhi (DEL)', lat: '28.5562', lng: '77.1000', loc: 'IN', currency: 'INR' },
    { label: 'Paris (CDG)', lat: '49.0097', lng: '2.5479', loc: 'FR', currency: 'EUR' },
    { label: 'Singapore (SIN)', lat: '1.3644', lng: '103.9915', loc: 'SG', currency: 'USD' },
    { label: 'Bangkok (BKK)', lat: '13.6900', lng: '100.7501', loc: 'TH', currency: 'USD' },
];

const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    REFUND_PROCESSING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

const MOCK_BOOKINGS: CarBooking[] = [
    { id: 'CBK001', passengerName: 'Ravi Kumar', passengerEmail: 'ravi@example.com', carName: 'Toyota Corolla', category: 'Economy', supplier: 'Hertz', pickupLocation: 'New York JFK', pickupDate: '2026-03-10', dropoffDate: '2026-03-13', totalPrice: 156, currency: 'USD', status: 'CONFIRMED', createdAt: '2026-03-01' },
    { id: 'CBK002', passengerName: 'Priya Shah', passengerEmail: 'priya@example.com', carName: 'Ford SUV', category: 'SUV', supplier: 'Avis', pickupLocation: 'London Heathrow', pickupDate: '2026-03-15', dropoffDate: '2026-03-18', totalPrice: 220, currency: 'GBP', status: 'PENDING', createdAt: '2026-03-01' },
    { id: 'CBK003', passengerName: 'Anil Mehta', passengerEmail: 'anil@example.com', carName: 'Mercedes C-Class', category: 'Premium', supplier: 'Enterprise', pickupLocation: 'Dubai DXB', pickupDate: '2026-03-05', dropoffDate: '2026-03-08', totalPrice: 320, currency: 'USD', status: 'CANCELLED', createdAt: '2026-02-25' },
];

export default function CarRental() {
    const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');

    // Search form
    const [pickupLoc, setPickupLoc] = useState('0'); // index into LOCATIONS
    const [pickupDate, setPickupDate] = useState('');
    const [dropoffDate, setDropoffDate] = useState('');
    const [pickupTime, setPickupTime] = useState('10:00');
    const [dropoffTime, setDropoffTime] = useState('10:00');
    const [driverAge, setDriverAge] = useState(30);

    // Results
    const [searching, setSearching] = useState(false);
    const [cars, setCars] = useState<CarResult[]>([]);
    const [searchDone, setSearchDone] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [selectedCar, setSelectedCar] = useState<string | null>(null);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingPassenger, setBookingPassenger] = useState('');
    const [bookingEmail, setBookingEmail] = useState('');

    // Manage
    const [bookings, setBookings] = useState<CarBooking[]>(MOCK_BOOKINGS);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    const selectedLocation = LOCATIONS[Number(pickupLoc)];

    const handleSearch = async () => {
        if (!pickupDate || !dropoffDate) return;
        setSearching(true);
        setCars([]);
        setSearchError('');
        setSearchDone(false);
        setSelectedCar(null);
        setShowBookingForm(false);

        try {
            const params = new URLSearchParams({
                pick_up_latitude: selectedLocation.lat,
                pick_up_longitude: selectedLocation.lng,
                drop_off_latitude: selectedLocation.lat,
                drop_off_longitude: selectedLocation.lng,
                pick_up_date: pickupDate,
                drop_off_date: dropoffDate,
                pick_up_time: pickupTime,
                drop_off_time: dropoffTime,
                driver_age: String(driverAge),
                currency_code: selectedLocation.currency,
                location: selectedLocation.loc,
            });

            const res = await axios.get(`/api/cars/search?${params.toString()}`);
            if (res.data.success) {
                setCars(res.data.data);
                if (res.data.data.length === 0) {
                    setSearchError('No cars available for this location and dates. Please try different options.');
                }
            } else {
                setSearchError(res.data.error || 'Search failed. Try a different location or dates.');
            }
        } catch (err: any) {
            setSearchError(err.response?.data?.error || err.message || 'Car search failed.');
        } finally {
            setSearching(false);
            setSearchDone(true);
        }
    };

    const handleBook = () => {
        if (!bookingPassenger || !bookingEmail) return showToast('Please fill all required details.', 'error');
        const car = cars.find(c => c.id === selectedCar);
        if (!car) return;
        const newBooking: CarBooking = {
            id: `CBK${Date.now().toString().slice(-5)}`,
            passengerName: bookingPassenger,
            passengerEmail: bookingEmail,
            carName: car.name,
            category: car.category,
            supplier: car.supplier,
            pickupLocation: selectedLocation.label,
            pickupDate,
            dropoffDate,
            totalPrice: car.totalPrice || car.basePrice,
            currency: car.currency,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString().slice(0, 10),
        };
        setBookings(prev => [newBooking, ...prev]);
        setShowBookingForm(false);
        showToast(`🚗 Car booked! ${newBooking.id} — ${car.name} | ${car.currency} ${newBooking.totalPrice}`);
        setActiveTab('manage');
        setBookingPassenger('');
        setBookingEmail('');
    };

    const handleStatusUpdate = (id: string, status: CarBooking['status']) => {
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
        return matchStatus && (!q || b.passengerName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.carName.toLowerCase().includes(q));
    });

    const stats = {
        total: bookings.length,
        confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
        cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    };

    const days = pickupDate && dropoffDate
        ? Math.max(1, Math.ceil((new Date(dropoffDate).getTime() - new Date(pickupDate).getTime()) / 86400000))
        : 1;

    const selectedCarObj = cars.find(c => c.id === selectedCar);

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-8 shadow-2xl shadow-emerald-900/40">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-emerald-300/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                        <Car size={32} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-white tracking-tight">Car Rental Management</h1>
                        <p className="text-emerald-200/60 mt-1 font-medium">Powered by Booking.com · Real-time car rental prices &amp; availability</p>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-right">
                            <p className="text-3xl font-black text-white">{stats.total}</p>
                            <p className="text-emerald-200/50 text-[10px] uppercase tracking-widest">Bookings</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-emerald-300">{stats.confirmed}</p>
                            <p className="text-emerald-200/50 text-[10px] uppercase tracking-widest">Confirmed</p>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 flex gap-4 mt-6 pt-6 border-t border-white/10 flex-wrap">
                    {[
                        { label: 'Confirmed', val: stats.confirmed, color: 'text-emerald-300' },
                        { label: 'Pending', val: stats.pending, color: 'text-amber-300' },
                        { label: 'Cancelled', val: stats.cancelled, color: 'text-rose-300' },
                    ].map(s => (
                        <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                            <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                            <p className="text-white/40 text-[10px] font-bold uppercase">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit data-[theme=light]:bg-slate-100 data-[theme=light]:border-slate-300">
                {[
                    { key: 'search', label: 'Search & Book Cars', icon: Search },
                    { key: 'manage', label: 'Manage Bookings', icon: Car },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 data-[theme=light]:bg-emerald-600 data-[theme=light]:shadow-emerald-500/30'
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
                        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-2 data-[theme=light]:text-slate-900">
                            <Car size={20} className="text-emerald-400 data-[theme=light]:text-emerald-600" />
                            Search Car Rentals — Real-time Booking.com Rates
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                            {/* Pickup Location */}
                            <div className="space-y-1.5 lg:col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Pickup Location</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 data-[theme=light]:text-emerald-600" />
                                    <select
                                        value={pickupLoc}
                                        onChange={e => setPickupLoc(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all cursor-pointer data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                    >
                                        {LOCATIONS.map((loc, i) => (
                                            <option key={i} value={i}>{loc.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Driver Age */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Driver Age</label>
                                <div className="relative">
                                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 data-[theme=light]:text-emerald-600" />
                                    <input
                                        type="number"
                                        min={18}
                                        max={99}
                                        value={driverAge}
                                        onChange={e => setDriverAge(Number(e.target.value))}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Pickup Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Pickup Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 data-[theme=light]:text-emerald-600" />
                                    <input
                                        type="date"
                                        value={pickupDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => { setPickupDate(e.target.value); if (!dropoffDate || e.target.value >= dropoffDate) { const d = new Date(e.target.value); d.setDate(d.getDate() + 3); setDropoffDate(d.toISOString().split('T')[0]); } }}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all [color-scheme:dark] data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 [&::-webkit-calendar-picker-indicator]:data-[theme=light]:filter-none"
                                    />
                                </div>
                            </div>

                            {/* Pickup Time */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Pickup Time</label>
                                <select
                                    value={pickupTime}
                                    onChange={e => setPickupTime(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all cursor-pointer data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                >
                                    {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dropoff Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Drop-off Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 data-[theme=light]:text-teal-600" />
                                    <input
                                        type="date"
                                        value={dropoffDate}
                                        min={pickupDate || new Date().toISOString().split('T')[0]}
                                        onChange={e => setDropoffDate(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all [color-scheme:dark] data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900 [&::-webkit-calendar-picker-indicator]:data-[theme=light]:filter-none"
                                    />
                                </div>
                            </div>

                            {/* Dropoff Time */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 data-[theme=light]:text-slate-600">Drop-off Time</label>
                                <select
                                    value={dropoffTime}
                                    onChange={e => setDropoffTime(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all cursor-pointer data-[theme=light]:bg-white data-[theme=light]:border-slate-300 data-[theme=light]:text-slate-900"
                                >
                                    {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                                        <option key={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {pickupDate && dropoffDate && (
                            <div className="mb-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2 w-fit data-[theme=light]:text-emerald-700 data-[theme=light]:bg-emerald-50 data-[theme=light]:border-emerald-200">
                                <Calendar size={12} />
                                Rental duration: <strong>{days} day{days !== 1 ? 's' : ''}</strong>
                                <span className="text-slate-500">·</span>
                                <MapPin size={12} />
                                {selectedLocation.label}
                            </div>
                        )}

                        <div className="flex justify-center mt-4">
                            <button
                                onClick={handleSearch}
                                disabled={!pickupDate || !dropoffDate || searching}
                                className={`flex items-center gap-3 px-12 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-900/30 text-sm transition-all data-[theme=light]:shadow-emerald-500/30
                                    ${(!pickupDate || !dropoffDate || searching) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-95'}`}
                            >
                                {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                {searching ? 'Fetching Live Prices...' : 'Search Available Cars'}
                            </button>
                        </div>
                    </div>

                    {/* Loading */}
                    {searching && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/20">
                                <Car size={28} className="text-emerald-400" />
                            </div>
                            <p className="text-emerald-300 font-bold text-lg">Fetching live car rental prices from Booking.com...</p>
                        </div>
                    )}

                    {/* Error */}
                    {searchError && searchDone && !searching && (
                        <div className="flex items-center gap-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5">
                            <AlertCircle size={20} className="text-rose-400 shrink-0" />
                            <div>
                                <p className="text-rose-300 font-bold">Search Failed</p>
                                <p className="text-rose-400/60 text-sm">{searchError}</p>
                            </div>
                            <button onClick={handleSearch} className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-black transition-all">
                                <RefreshCw size={12} /> Retry
                            </button>
                        </div>
                    )}

                    {/* Car results */}
                    {searchDone && !searching && cars.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h3 className="text-white font-black text-lg flex items-center gap-2">
                                    <Car size={18} className="text-emerald-400" />
                                    {cars.length} Cars Found
                                    <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{days} day{days > 1 ? 's' : ''}</span>
                                    <span className="text-xs text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">{selectedLocation.label}</span>
                                </h3>
                            </div>

                            {cars.map(car => {
                                const isSelected = selectedCar === car.id;
                                return (
                                    <div
                                        key={car.id}
                                        onClick={() => { setSelectedCar(car.id); setShowBookingForm(true); }}
                                        className={`group bg-slate-900/70 border rounded-2xl p-5 cursor-pointer transition-all duration-300 ${isSelected
                                            ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-900/20'
                                            : 'border-slate-700/60 hover:border-emerald-500/40 hover:bg-slate-900/90'}`}
                                    >
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                                            {/* Car image / icon */}
                                            <div className="w-20 h-16 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl flex items-center justify-center shrink-0 shadow">
                                                <Car size={28} className="text-white" />
                                            </div>

                                            {/* Car info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-2 flex-wrap">
                                                    <p className="text-white font-black text-base leading-tight">{car.name}</p>
                                                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">{car.category}</span>
                                                    {car.freeCancellation && (
                                                        <span className="text-[10px] font-black text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                                            <Shield size={9} /> Free Cancel
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-slate-400 text-xs mt-1 font-semibold">{car.supplier}</p>

                                                {/* Specs */}
                                                <div className="flex flex-wrap gap-3 mt-3">
                                                    {car.seats !== '—' && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Users size={11} className="text-emerald-400" />
                                                            {car.seats} seats
                                                        </div>
                                                    )}
                                                    {car.doors !== '—' && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Car size={11} className="text-emerald-400" />
                                                            {car.doors} doors
                                                        </div>
                                                    )}
                                                    {car.transmission !== '—' && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Settings2 size={11} className="text-emerald-400" />
                                                            {car.transmission}
                                                        </div>
                                                    )}
                                                    {car.fuelType !== '—' && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Fuel size={11} className="text-emerald-400" />
                                                            {car.fuelType}
                                                        </div>
                                                    )}
                                                    {car.aircon && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Wind size={11} className="text-emerald-400" />
                                                            A/C
                                                        </div>
                                                    )}
                                                    {car.rating && (
                                                        <div className="flex items-center gap-1 text-xs text-amber-400">
                                                            <Star size={10} fill="currentColor" />
                                                            {car.rating}
                                                            {car.reviewCount && <span className="text-slate-500">({car.reviewCount})</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Price + Book */}
                                            <div className="md:ml-auto flex items-center gap-4 shrink-0">
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-white">
                                                        {car.currency} {(car.totalPrice || car.basePrice).toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-bold">total · {car.currency} {car.pricePerDay}/day</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedCar(car.id); setShowBookingForm(true); }}
                                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-900/20 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
                                                >
                                                    BOOK NOW
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Booking form */}
                            {showBookingForm && selectedCarObj && (
                                <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-7 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                                    <h3 className="text-white font-black text-lg mb-1 flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-emerald-400" />
                                        Confirm Car Rental
                                    </h3>
                                    <p className="text-slate-400 text-xs mb-5">
                                        {selectedCarObj.name} · {selectedCarObj.supplier} · {selectedLocation.label}
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Driver Full Name *</label>
                                            <input
                                                type="text"
                                                placeholder="Enter driver name"
                                                value={bookingPassenger}
                                                onChange={e => setBookingPassenger(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Driver Email *</label>
                                            <input
                                                type="email"
                                                placeholder="Enter email"
                                                value={bookingEmail}
                                                onChange={e => setBookingEmail(e.target.value)}
                                                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Car', val: selectedCarObj.name },
                                            { label: 'Pickup', val: `${pickupDate} ${pickupTime}` },
                                            { label: 'Drop-off', val: `${dropoffDate} ${dropoffTime}` },
                                            { label: 'Total', val: `${selectedCarObj.currency} ${(selectedCarObj.totalPrice || selectedCarObj.basePrice).toLocaleString()}` },
                                        ].map(item => (
                                            <div key={item.label}>
                                                <p className="text-emerald-400/60 text-[10px] font-bold uppercase">{item.label}</p>
                                                <p className="text-white font-black text-sm">{item.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => { setShowBookingForm(false); setSelectedCar(null); }}
                                            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-black rounded-xl">
                                            CANCEL
                                        </button>
                                        <button onClick={handleBook}
                                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black rounded-xl shadow-lg flex items-center justify-center gap-2">
                                            <CheckCircle2 size={16} /> CONFIRM &amp; BOOK CAR
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
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name, car, booking ID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 placeholder-slate-600"
                            />
                        </div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 flex-wrap">
                            {['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED', 'REFUND_PROCESSING'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${statusFilter === s ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                                    {s === 'REFUND_PROCESSING' ? 'REFUND' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        {['ID', 'Driver', 'Car', 'Location', 'Pickup', 'Return', 'Total', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-16 text-slate-500">
                                                <Car size={32} className="mx-auto mb-3 opacity-30" />
                                                <p className="font-bold">No car bookings found</p>
                                            </td>
                                        </tr>
                                    ) : filtered.map((b, i) => (
                                        <tr key={b.id} className={`border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors ${i % 2 ? 'bg-white/[0.01]' : ''}`}>
                                            <td className="px-4 py-4"><span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{b.id}</span></td>
                                            <td className="px-4 py-4">
                                                <p className="text-white font-semibold text-sm">{b.passengerName}</p>
                                                <p className="text-slate-500 text-xs">{b.passengerEmail}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="text-white text-xs font-bold">{b.carName}</p>
                                                <p className="text-slate-500 text-[10px]">{b.category} · {b.supplier}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1 text-xs text-slate-300">
                                                    <MapPin size={11} className="text-emerald-400" />
                                                    {b.pickupLocation}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">{b.pickupDate}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <ArrowRight size={10} className="text-slate-600" />
                                                    {b.dropoffDate}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-white font-black text-sm whitespace-nowrap">
                                                {b.currency} {b.totalPrice.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black w-fit ${STATUS_COLORS[b.status]}`}>
                                                        {b.status === 'REFUND_PROCESSING' ? 'REFUND' : b.status}
                                                    </span>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {(['CONFIRMED', 'PENDING', 'CANCELLED'] as const).filter(s => s !== b.status).map(s => (
                                                            <button key={s} onClick={() => handleStatusUpdate(b.id, s)}
                                                                className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all">
                                                                → {s.slice(0, 4)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button onClick={() => handleDelete(b.id)}
                                                    className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition-all" title="Delete">
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
