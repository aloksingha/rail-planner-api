import { useState, useEffect } from 'react';
import axios from 'axios';
import { recordRouteSearch } from '../utils/visitorIntelligence';
import {
    Bus, Search, Calendar, MapPin, Users, CheckCircle2,
    Loader2, AlertCircle, RefreshCw, Trash2, ArrowRight,
    Star, Shield, Sparkles, Phone, Mail, ArrowLeftRight,
    Clock, Award, Wifi, Zap, Droplets, Info, Compass
} from 'lucide-react';

interface Seat {
    no: string;
    deck: 'LOWER' | 'UPPER';
    type: 'SEATER' | 'SLEEPER';
    row: number;
    col: number;
    price: number;
    isAvailable: boolean;
    isBooked: boolean;
    isLadies: boolean;
}

interface BusResult {
    id: string;
    operatorName: string;
    busType: string;
    category: string;
    sourceCity: string;
    destCity: string;
    travelDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    fare: number;
    currency: string;
    rating: number;
    reviewsCount: number;
    availableSeats: number;
    totalSeats: number;
    amenities: string[];
    cancellationPolicy: string;
    boardingPoints: { location: string; time: string }[];
    droppingPoints: { location: string; time: string }[];
    isAbhiBusLive?: boolean;
}

interface BusBookingRecord {
    id: string;
    operatorName: string;
    busType: string;
    fromCity: string;
    toCity: string;
    travelDate: string;
    departureTime: string;
    boardingPoint: string;
    seats: string;
    totalAmount: number;
    passengerName: string;
    contactPhone: string;
    status: 'CONFIRMED' | 'CANCELLED';
    createdAt: string;
}

const POPULAR_ROUTES = [
    { from: 'Raiganj', to: 'Kolkata' },
    { from: 'Siliguri', to: 'Kolkata' },
    { from: 'Malda', to: 'Kolkata' },
    { from: 'Delhi', to: 'Manali' },
    { from: 'Bangalore', to: 'Goa' },
];

export default function BusBooking() {
    const [activeTab, setActiveTab] = useState<'search' | 'manage'>('search');

    // Search Form State
    const [source, setSource] = useState('Raiganj');
    const [destination, setDestination] = useState('Kolkata');
    const [date, setDate] = useState(() => {
        const tomorrow = new Date(Date.now() + 86400000);
        return tomorrow.toISOString().split('T')[0];
    });
    const [busTypeFilter, setBusTypeFilter] = useState<'all' | 'sleeper' | 'seater'>('all');
    const [sortBy, setSortBy] = useState<'price' | 'rating'>('price');

    // Results & Loading State
    const [searching, setSearching] = useState(false);
    const [buses, setBuses] = useState<BusResult[]>([]);
    const [searchDone, setSearchDone] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Seat Selection Modal State
    const [selectedBus, setSelectedBus] = useState<BusResult | null>(null);
    const [loadingSeats, setLoadingSeats] = useState(false);
    const [seatLayout, setSeatLayout] = useState<{ lower: Seat[]; upper: Seat[] }>({ lower: [], upper: [] });
    const [selectedDeck, setSelectedDeck] = useState<'LOWER' | 'UPPER'>('LOWER');
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [selectedBoarding, setSelectedBoarding] = useState<string>('');
    const [selectedDropping, setSelectedDropping] = useState<string>('');

    // Passenger Checkout State
    const [showPassengerModal, setShowPassengerModal] = useState(false);
    const [passengerName, setPassengerName] = useState('');
    const [passengerAge, setPassengerAge] = useState('');
    const [passengerGender, setPassengerGender] = useState<'M' | 'F' | 'O'>('M');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [bookingInProgress, setBookingInProgress] = useState(false);
    const [confirmedBooking, setConfirmedBooking] = useState<BusBookingRecord | null>(null);

    // Bookings history in local storage
    const [bookingsHistory, setBookingsHistory] = useState<BusBookingRecord[]>(() => {
        try {
            const saved = localStorage.getItem('tp_bus_bookings');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Toast
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleSwapCities = () => {
        setSource(destination);
        setDestination(source);
    };

    const handleSearch = async () => {
        if (!source || !destination || !date) return;
        recordRouteSearch(source, destination, 'bus', date);
        setSearching(true);
        setSearchError('');
        setSearchDone(false);
        setSelectedBus(null);
        try {
            const params = new URLSearchParams({
                source,
                destination,
                date,
                busType: busTypeFilter,
                sortBy
            });
            const res = await axios.get(`/api/buses/search?${params.toString()}`);
            if (res.data.success) {
                setBuses(res.data.data);
                if (res.data.data.length === 0) {
                    setSearchError('No buses found for this route. Try switching dates or selecting another route.');
                }
            } else {
                setSearchError(res.data.error || 'Failed to search buses.');
            }
        } catch (err: any) {
            setSearchError(err.response?.data?.error || err.message || 'Bus search failed.');
        } finally {
            setSearching(false);
            setSearchDone(true);
        }
    };

    // Auto search on mount
    useEffect(() => {
        handleSearch();
    }, []);

    const handleOpenSeatSelection = async (bus: BusResult) => {
        setSelectedBus(bus);
        setSelectedSeats([]);
        setSelectedBoarding(bus.boardingPoints[0]?.location || '');
        setSelectedDropping(bus.droppingPoints[0]?.location || '');
        setLoadingSeats(true);
        try {
            const res = await axios.get(`/api/buses/${bus.id}/seats?fare=${bus.fare}`);
            if (res.data.success) {
                setSeatLayout({
                    lower: res.data.layout.lowerDeckSeats || [],
                    upper: res.data.layout.upperDeckSeats || []
                });
            }
        } catch (err: any) {
            showToast('Failed to load bus seat layout.', 'error');
        } finally {
            setLoadingSeats(false);
        }
    };

    const handleToggleSeat = (seat: Seat) => {
        if (!seat.isAvailable) return;
        const exists = selectedSeats.some(s => s.no === seat.no);
        if (exists) {
            setSelectedSeats(prev => prev.filter(s => s.no !== seat.no));
        } else {
            if (selectedSeats.length >= 6) {
                showToast('Maximum 6 seats can be selected per booking.', 'error');
                return;
            }
            setSelectedSeats(prev => [...prev, seat]);
        }
    };

    const handleProceedToPassenger = () => {
        if (selectedSeats.length === 0) {
            showToast('Please select at least 1 seat to continue.', 'error');
            return;
        }
        setShowPassengerModal(true);
    };

    const handleFinalBooking = async () => {
        if (!passengerName || !contactPhone) {
            showToast('Please enter passenger name and mobile number.', 'error');
            return;
        }
        if (contactPhone.replace(/\D/g, '').length !== 10) {
            showToast('Please enter a valid 10-digit mobile number.', 'error');
            return;
        }

        setBookingInProgress(true);
        try {
            const payload = {
                busId: selectedBus?.id,
                operatorName: selectedBus?.operatorName,
                busType: selectedBus?.busType,
                fromCity: selectedBus?.sourceCity,
                toCity: selectedBus?.destCity,
                travelDate: selectedBus?.travelDate,
                departureTime: selectedBus?.departureTime,
                boardingPoint: selectedBoarding,
                droppingPoint: selectedDropping,
                selectedSeats,
                passengers: [{ name: passengerName, age: passengerAge, gender: passengerGender }],
                contactPhone,
                contactEmail
            };

            const res = await axios.post('/api/buses/book', payload);
            if (res.data.success) {
                const newRecord: BusBookingRecord = {
                    id: res.data.bookingId,
                    operatorName: selectedBus?.operatorName || 'Intercity Bus',
                    busType: selectedBus?.busType || 'AC Sleeper',
                    fromCity: selectedBus?.sourceCity || source,
                    toCity: selectedBus?.destCity || destination,
                    travelDate: selectedBus?.travelDate || date,
                    departureTime: selectedBus?.departureTime || '20:00',
                    boardingPoint: selectedBoarding,
                    seats: res.data.seatNumbers,
                    totalAmount: res.data.totalAmount,
                    passengerName,
                    contactPhone,
                    status: 'CONFIRMED',
                    createdAt: new Date().toLocaleDateString('en-IN')
                };

                const updated = [newRecord, ...bookingsHistory];
                setBookingsHistory(updated);
                localStorage.setItem('tp_bus_bookings', JSON.stringify(updated));

                setConfirmedBooking(newRecord);
                setShowPassengerModal(false);
                setSelectedBus(null);
                showToast('🎉 Bus ticket booked successfully! WhatsApp confirmation sent.');
            }
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Booking failed. Please try again.', 'error');
        } finally {
            setBookingInProgress(false);
        }
    };

    const totalFare = selectedSeats.reduce((acc, s) => acc + s.price, 0);
    const gstAmount = Math.round(totalFare * 0.05);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold transition-all ${
                    toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span>{toast.msg}</span>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900/30 via-slate-900 to-cyan-900/30 border border-slate-800 rounded-2xl p-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Bus className="w-3.5 h-3.5" />
                                Tickets Pro Intercity Bus Fleet
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                AbhiBus / Partner Network
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                            Luxury Bus Ticket Reservation
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Book Volvo Multi-Axle, Scania &amp; BharatBenz AC Sleeper buses with live interactive seat selection and instant WhatsApp tickets.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'search'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                        >
                            Search Buses
                        </button>
                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                                activeTab === 'manage'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                        >
                            My Bus Bookings
                            {bookingsHistory.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-400 text-slate-950 font-black">
                                    {bookingsHistory.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {activeTab === 'search' ? (
                    <>
                        {/* Search Card */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                            {/* Route Chips */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Popular Routes:</span>
                                {POPULAR_ROUTES.map((r, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => { setSource(r.from); setDestination(r.to); }}
                                        className="text-xs px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 border border-slate-700/60 transition-colors"
                                    >
                                        {r.from} ➔ {r.to}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* From */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                        Boarding City
                                    </label>
                                    <input
                                        type="text"
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                        placeholder="e.g. Raiganj or Kolkata"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* To */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Compass className="w-3.5 h-3.5 text-cyan-400" />
                                            Destination City
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleSwapCities}
                                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                                        >
                                            <ArrowLeftRight className="w-3 h-3" /> Swap
                                        </button>
                                    </label>
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        placeholder="e.g. Kolkata or Siliguri"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                        Travel Date
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                {/* Search Button */}
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSearch}
                                        disabled={searching}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        {searching ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Searching...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4" />
                                                Find Buses
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-semibold">Bus Type:</span>
                                    {(['all', 'sleeper', 'seater'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setBusTypeFilter(type)}
                                            className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors ${
                                                busTypeFilter === type
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            {type === 'all' ? 'All Types' : `${type} Only`}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-semibold">Sort By:</span>
                                    <button
                                        onClick={() => setSortBy('price')}
                                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                                            sortBy === 'price' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Lowest Fare
                                    </button>
                                    <button
                                        onClick={() => setSortBy('rating')}
                                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                                            sortBy === 'rating' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Top Rated
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search Error */}
                        {searchError && (
                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{searchError}</span>
                            </div>
                        )}

                        {/* Bus List */}
                        <div className="space-y-4">
                            {searching ? (
                                <div className="p-16 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
                                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                                    <p className="text-sm font-semibold text-slate-300">Searching luxury bus operators &amp; seat availability...</p>
                                </div>
                            ) : buses.length > 0 ? (
                                buses.map((bus) => (
                                    <div
                                        key={bus.id}
                                        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 transition-all shadow-lg hover:shadow-xl space-y-4"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Operator & Bus Details */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black text-white">{bus.operatorName}</h3>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                        {bus.rating.toFixed(1)}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">({bus.reviewsCount} reviews)</span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium">{bus.busType}</p>
                                                
                                                {/* Amenities */}
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {bus.amenities.slice(0, 4).map((a, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Timings & Duration */}
                                            <div className="flex items-center gap-6">
                                                <div className="text-left">
                                                    <p className="text-xl font-black text-white">{bus.departureTime}</p>
                                                    <p className="text-xs text-slate-400">{bus.sourceCity}</p>
                                                    <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{bus.boardingPoints[0]?.location}</p>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{bus.duration}</span>
                                                    <div className="w-20 h-0.5 bg-slate-700 relative my-1">
                                                        <Bus className="w-3.5 h-3.5 text-emerald-400 absolute left-1/2 -top-1.5 -translate-x-1/2" />
                                                    </div>
                                                    <span className="text-[9px] text-emerald-400 font-semibold">Direct Express</span>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-xl font-black text-white">{bus.arrivalTime}</p>
                                                    <p className="text-xs text-slate-400">{bus.destCity}</p>
                                                    <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{bus.droppingPoints[0]?.location}</p>
                                                </div>
                                            </div>

                                            {/* Price & Action */}
                                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-slate-800">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-[11px] text-slate-500">Starting from</span>
                                                    <p className="text-2xl font-black text-emerald-400">₹{bus.fare.toLocaleString('en-IN')}</p>
                                                    <span className="text-[11px] text-cyan-400 font-semibold">{bus.availableSeats} Seats Available</span>
                                                </div>

                                                <button
                                                    onClick={() => handleOpenSeatSelection(bus)}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                                                >
                                                    Select Seats
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : searchDone ? (
                                <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                                    No buses found. Please try another route or date.
                                </div>
                            ) : null}
                        </div>
                    </>
                ) : (
                    /* My Bookings History */
                    <div className="space-y-4">
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-400" />
                                Your Confirmed Bus Bookings
                            </h2>

                            {bookingsHistory.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    No bus bookings found. Search buses above to book your journey!
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bookingsHistory.map((b) => (
                                        <div key={b.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                        {b.id}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">{b.operatorName}</span>
                                                    <span className="text-[10px] text-slate-500">({b.busType})</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-200">
                                                    {b.fromCity} ➔ {b.toCity} • {b.travelDate} at {b.departureTime}
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Passenger: <strong className="text-white">{b.passengerName}</strong> | Seats: <span className="text-cyan-400 font-bold">{b.seats}</span> | Boarding: {b.boardingPoint}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                                                <span className="text-lg font-black text-emerald-400">₹{b.totalAmount.toLocaleString('en-IN')}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    CONFIRMED
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Interactive Seat Selector Modal ────────────────────────────────────── */}
            {selectedBus && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-black text-white">{selectedBus.operatorName}</h3>
                                <p className="text-xs text-slate-400">{selectedBus.sourceCity} ➔ {selectedBus.destCity} • {selectedBus.travelDate} ({selectedBus.departureTime})</p>
                            </div>
                            <button
                                onClick={() => setSelectedBus(null)}
                                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {loadingSeats ? (
                            <div className="p-16 text-center">
                                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Loading seat layout...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Seat Layout Container (8 cols) */}
                                <div className="lg:col-span-7 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                                    {/* Deck Switcher */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedDeck('LOWER')}
                                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    selectedDeck === 'LOWER' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                                                }`}
                                            >
                                                Lower Deck
                                            </button>
                                            <button
                                                onClick={() => setSelectedDeck('UPPER')}
                                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    selectedDeck === 'UPPER' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                                                }`}
                                            >
                                                Upper Deck (Sleeper)
                                            </button>
                                        </div>

                                        {/* Driver Cabin */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                                            <span>Front (Driver)</span>
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">🚗</div>
                                        </div>
                                    </div>

                                    {/* Seats Grid */}
                                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80">
                                        <div className="grid grid-cols-4 gap-3">
                                            {(selectedDeck === 'LOWER' ? seatLayout.lower : seatLayout.upper).map((seat) => {
                                                const isSelected = selectedSeats.some(s => s.no === seat.no);
                                                return (
                                                    <button
                                                        key={seat.no}
                                                        type="button"
                                                        disabled={!seat.isAvailable}
                                                        onClick={() => handleToggleSeat(seat)}
                                                        className={`relative p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                                                            !seat.isAvailable
                                                                ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                                                                : isSelected
                                                                ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/30 scale-105'
                                                                : seat.isLadies
                                                                ? 'bg-pink-950/40 border border-pink-500/40 text-pink-300 hover:border-pink-400'
                                                                : 'bg-slate-950 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-black">{seat.no}</span>
                                                        <span className="text-[10px] opacity-80">₹{seat.price}</span>
                                                        {seat.isLadies && !isSelected && (
                                                            <span className="text-[8px] text-pink-400 font-bold uppercase mt-0.5">Ladies</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Seat Legend */}
                                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-700"></div>
                                            <span>Available</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-3.5 rounded bg-emerald-500"></div>
                                            <span>Selected</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-800"></div>
                                            <span>Booked</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3.5 h-3.5 rounded bg-pink-950/40 border border-pink-500/40"></div>
                                            <span>Ladies</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Summary & Pickup Points (5 cols) */}
                                <div className="lg:col-span-5 space-y-4">
                                    {/* Boarding & Dropping Points */}
                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400">Boarding Point</label>
                                            <select
                                                value={selectedBoarding}
                                                onChange={(e) => setSelectedBoarding(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                            >
                                                {selectedBus.boardingPoints.map((bp, i) => (
                                                    <option key={i} value={bp.location}>
                                                        {bp.location} ({bp.time})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400">Dropping Point</label>
                                            <select
                                                value={selectedDropping}
                                                onChange={(e) => setSelectedDropping(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                            >
                                                {selectedBus.droppingPoints.map((dp, i) => (
                                                    <option key={i} value={dp.location}>
                                                        {dp.location} ({dp.time})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Fare Card */}
                                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fare Summary</h4>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-slate-300">
                                                <span>Selected Seats ({selectedSeats.length}):</span>
                                                <span className="font-bold text-white">
                                                    {selectedSeats.length > 0 ? selectedSeats.map(s => s.no).join(', ') : 'None'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-300">
                                                <span>Base Fare:</span>
                                                <span className="font-bold">₹{totalFare.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-300">
                                                <span>GST (5%):</span>
                                                <span className="font-bold">₹{gstAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black text-emerald-400">
                                                <span>Total Payable:</span>
                                                <span>₹{(totalFare + gstAmount).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleProceedToPassenger}
                                            disabled={selectedSeats.length === 0}
                                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-xs"
                                        >
                                            Proceed to Passenger Details ➔
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Passenger Checkout Modal ─────────────────────────────────────────── */}
            {showPassengerModal && selectedBus && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-lg font-black text-white">Passenger &amp; Contact Info</h3>
                                <p className="text-xs text-slate-400">Seats: <strong className="text-emerald-400">{selectedSeats.map(s => s.no).join(', ')}</strong> | Total: ₹{(totalFare + gstAmount).toLocaleString('en-IN')}</p>
                            </div>
                            <button onClick={() => setShowPassengerModal(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div className="space-y-1">
                                <label className="font-bold text-slate-300">Primary Passenger Name *</label>
                                <input
                                    type="text"
                                    value={passengerName}
                                    onChange={(e) => setPassengerName(e.target.value)}
                                    placeholder="Enter full name"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Age *</label>
                                    <input
                                        type="number"
                                        value={passengerAge}
                                        onChange={(e) => setPassengerAge(e.target.value)}
                                        placeholder="e.g. 28"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Gender *</label>
                                    <select
                                        value={passengerGender}
                                        onChange={(e) => setPassengerGender(e.target.value as any)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                    WhatsApp Mobile Number * (For Instant Ticket Dispatch)
                                </label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-700 bg-slate-800 text-slate-400 font-bold">
                                        +91
                                    </span>
                                    <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        placeholder="10-digit mobile"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-r-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                                    Email Address (For Official GST Invoice)
                                </label>
                                <input
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="e.g. name@example.com"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleFinalBooking}
                                disabled={bookingInProgress}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                            >
                                {bookingInProgress ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Confirming Reservation...
                                    </>
                                ) : (
                                    `Pay ₹${(totalFare + gstAmount).toLocaleString('en-IN')} & Confirm Ticket`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Booking Success Popup ───────────────────────────────────────────── */}
            {confirmedBooking && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <h3 className="text-xl font-black text-white">Bus Ticket Confirmed!</h3>
                        <p className="text-xs text-slate-300 font-medium">
                            Your reservation has been confirmed. A WhatsApp confirmation has been dispatched to <strong>+91 {confirmedBooking.contactPhone}</strong>.
                        </p>

                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-left space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Booking ID:</span>
                                <span className="font-mono font-bold text-emerald-400">{confirmedBooking.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Operator:</span>
                                <span className="font-bold text-white">{confirmedBooking.operatorName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Route:</span>
                                <span className="font-bold text-white">{confirmedBooking.fromCity} ➔ {confirmedBooking.toCity}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Seats:</span>
                                <span className="font-bold text-cyan-400">{confirmedBooking.seats}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total Paid:</span>
                                <span className="font-bold text-emerald-400">₹{confirmedBooking.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { setConfirmedBooking(null); setActiveTab('manage'); }}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            View in My Bookings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
