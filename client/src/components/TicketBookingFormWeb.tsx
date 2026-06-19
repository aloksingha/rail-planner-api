import { useState, useRef, useEffect } from 'react';
import { 
    Train, MapPin, Calendar, Users, Phone, Mail, 
    CheckCircle2,
    AlertCircle, ArrowLeft, Loader2, ArrowLeftRight, Tags, IndianRupee, AlertTriangle, Wallet 
} from 'lucide-react';
import brandLogo from '../assets/brand_logo.png';
import axios from 'axios';
// import Datepicker from "react-tailwindcss-datepicker"; // Removed due to production visibility issues
import { isValidIndianMobile } from '../utils/validation';
import { POPULAR_STATIONS, STATION_OVERRIDES, FRONTEND_NEARBY_STATIONS } from '../utils/constants';
import { TRAIN_CLASS_LABELS, getClassesToShow, getTicketPrice, resolveToCode } from '../utils/trainUtils';

interface Passenger {
    name: string;
    age: string;
    gender: 'M' | 'F' | 'O';
}


interface IRCTCTrain {
    train_base: {
        train_no: string;
        train_name: string;
        from_stn_name: string;
        to_stn_name: string;
        from_time: string;
        to_time: string;
        travel_time: string;
        running_days?: { [key: string]: boolean };
        available_classes?: string[];  // Class codes from API e.g. ['2A','3A','SL']
        train_type?: string;           // Added train type for better filtering
        prices?: Record<string, number>; // Added pre-calculated prices from backend
        departure_date?: string;
        arrival_date?: string;
        departure_date_friendly?: string;
        arrival_date_friendly?: string;
    };
    isAlternative?: boolean;           // Added for nearby station fallback logic
}

/* TrainScheduleStop removed as it's unused */





const STATION_DROPDOWN_STYLES = "max-h-[450px] overflow-y-auto custom-scrollbar";

function StationDropdown({ search, stations, loading, onSelect }: { search: string; stations: any[]; loading: boolean; onSelect: (stn: any) => void }) {
    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching Stations...</span>
            </div>
        );
    }

    const filtered = search.length < 2 && stations.length === 0
        ? POPULAR_STATIONS 
        : stations.length > 0 ? stations : STATION_OVERRIDES.filter(s => 
            s.name.toLowerCase().includes(search.toLowerCase()) || 
            s.code.toLowerCase().includes(search.toLowerCase())
        );

    if (filtered.length === 0 && search.length >= 2) {
        return (
            <div className="p-8 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Stations Found</span>
            </div>
        );
    }

    return (
        <div className={STATION_DROPDOWN_STYLES}>
            {filtered.map(stn => (
                <button
                    key={stn.code}
                    type="button"
                    onClick={() => onSelect(stn)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 flex items-center gap-4 transition-colors border-b border-slate-100 last:border-0 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-black text-xs border border-slate-200 group-hover:scale-110 transition-transform uppercase">
                        {stn.code.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-base">{stn.name}</span>
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">{stn.code} Station</span>
                    </div>
                </button>
            ))}
        </div>
    );
}

const formatDateDDMMYY = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
};

export default function TicketBookingForm({ prefillData }: { prefillData?: any }) {
    const user = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    })();

    // Admin check removed as it's not used here anymore
    // Memoized date restrictions for performance and to prevent re-renders
    const minBookDate = new Date();
    minBookDate.setHours(0,0,0,0);
    // Strict 3-day gap for all users
    minBookDate.setDate(minBookDate.getDate() + 3);

    const maxBookDate = new Date();
    maxBookDate.setHours(0,0,0,0);
    maxBookDate.setDate(maxBookDate.getDate() + 15);

    // Date formatting helper for date restrictions (Strict 3-day gap)
    /* formatLocalBoxDate, minDateStr and maxDateStr removed as they are unused */

    const [bookingState, setBookingState] = useState<'editing' | 'confirming' | 'success'>('editing');

    // Form fields

    const [trainNo, setTrainNo] = useState(() => localStorage.getItem('tp_trainNo') || '');
    const [selectedTrainName, setSelectedTrainName] = useState(() => localStorage.getItem('tp_selectedTrainName') || '');
    const [trainClass, setTrainClass] = useState(() => localStorage.getItem('tp_trainClass') || '');
    const [source, setSource] = useState(() => localStorage.getItem('tp_source') || '');
    const [destination, setDestination] = useState(() => localStorage.getItem('tp_destination') || '');
    const [sourceSearch, setSourceSearch] = useState(() => localStorage.getItem('tp_sourceSearch') || '');
    const [destinationSearch, setDestinationSearch] = useState(() => localStorage.getItem('tp_destinationSearch') || '');
    const [sourceStations, setSourceStations] = useState<any[]>([]);
    const [destStations, setDestStations] = useState<any[]>([]);
    const [isSearchingSource, setIsSearchingSource] = useState(false);
    const [isSearchingDest, setIsSearchingDest] = useState(false);

    // Debounced Station Search Logic
    useEffect(() => {
        if (sourceSearch.length < 2) {
            setSourceStations([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingSource(true);
            try {
                const { data } = await axios.get(`/api/stations/search?query=${sourceSearch}`);
                if (data.success && data.data.stations) {
                    setSourceStations(data.data.stations);
                }
            } catch (e) {
                console.error("Failed to search source stations", e);
            } finally {
                setIsSearchingSource(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [sourceSearch]);

    useEffect(() => {
        if (destinationSearch.length < 2) {
            setDestStations([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingDest(true);
            try {
                const { data } = await axios.get(`/api/stations/search?query=${destinationSearch}`);
                if (data.success && data.data.stations) {
                    setDestStations(data.data.stations);
                }
            } catch (e) {
                console.error("Failed to search destination stations", e);
            } finally {
                setIsSearchingDest(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [destinationSearch]);

    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);
    const [journeyDate, setJourneyDate] = useState(() => localStorage.getItem('tp_journeyDate') || '');
    const [mobile, setMobile] = useState(() => localStorage.getItem('tp_mobile') || '');
    const [email, setEmail] = useState(() => localStorage.getItem('tp_email') || '');
    const [passengers, setPassengers] = useState<Passenger[]>(() => {
        try {
            const saved = localStorage.getItem('tp_passengers');
            return saved ? JSON.parse(saved) : [{ name: '', age: '', gender: 'M' }];
        } catch {
            return [{ name: '', age: '', gender: 'M' }];
        }
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [isPriceRequested, setIsPriceRequested] = useState(false);
    const [customPrices, setCustomPrices] = useState<any[]>([]);
    const [dynamicCorridors, setDynamicCorridors] = useState<any[]>([]);
    const [selectedUnitPrice, setSelectedUnitPrice] = useState<number>(() => Number(localStorage.getItem('tp_selectedUnitPrice') || 0));
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState(() => localStorage.getItem('tp_couponCode') || '');
    const [appliedCoupon, setAppliedCoupon] = useState<any | null>(() => {
        try {
            const saved = localStorage.getItem('tp_appliedCoupon');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');
    const isSelecting = useRef(false);
    const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'WALLET' | 'OFFLINE'>('RAZORPAY');
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [isFetchingWallet, setIsFetchingWallet] = useState(false);

    // Persistence Effect
    useEffect(() => {
        if (bookingState === 'editing' || bookingState === 'confirming') {
            localStorage.setItem('tp_trainNo', trainNo);
            localStorage.setItem('tp_selectedTrainName', selectedTrainName);
            localStorage.setItem('tp_trainClass', trainClass);
            localStorage.setItem('tp_source', source);
            localStorage.setItem('tp_destination', destination);
            localStorage.setItem('tp_sourceSearch', sourceSearch);
            localStorage.setItem('tp_destinationSearch', destinationSearch);
            localStorage.setItem('tp_journeyDate', journeyDate);
            localStorage.setItem('tp_mobile', mobile);
            localStorage.setItem('tp_email', email);
            localStorage.setItem('tp_passengers', JSON.stringify(passengers));
            localStorage.setItem('tp_selectedUnitPrice', selectedUnitPrice.toString());
            localStorage.setItem('tp_couponCode', couponCode);
            localStorage.setItem('tp_appliedCoupon', appliedCoupon ? JSON.stringify(appliedCoupon) : '');
        }
    }, [trainNo, selectedTrainName, trainClass, source, destination, sourceSearch, destinationSearch, journeyDate, mobile, email, passengers, selectedUnitPrice, couponCode, appliedCoupon, bookingState]);


    useEffect(() => {
        if (bookingState === 'confirming') {
            const fetchWallet = async () => {
                setIsFetchingWallet(true);
                try {
                    const token = localStorage.getItem('token');
                    const { data } = await axios.get('/api/wallet/history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setWalletBalance(data.balance);
                } catch (e) {
                    console.error('Failed to fetch wallet', e);
                } finally {
                    setIsFetchingWallet(false);
                }
            };
            fetchWallet();
        }
    }, [bookingState]);

    // Schedule state
    const [showSchedule, setShowSchedule] = useState(false);
    const [scheduleData, setScheduleData] = useState<any[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [selectedTrainForSchedule, setSelectedTrainForSchedule] = useState<any>(null);

    const fetchSchedule = async (t: any) => {
        setSelectedTrainForSchedule(t);
        setShowSchedule(true);
        setLoadingSchedule(true);
        setScheduleData([]); // Clear previous
        try {
            const { data } = await axios.get(`/api/trains/schedule/${t.train_no}`);
            if (data.success) {
                setScheduleData(data.data);
            }
        } catch (e) {
            console.error("Failed to fetch schedule", e);
        } finally {
            setLoadingSchedule(false);
        }
    };


    useEffect(() => {
        // Removed v6.0 live alert for production polish
        console.log("%c [Tickets Pro] VERSION 7.0 LIVE - SALES ENHANCED ", "background: #10b981; color: white; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
    }, []);

    /* user already defined above */

    const [availableTrains, setAvailableTrains] = useState<IRCTCTrain[] | null>(null);
    const [isLoadingTrains, setIsLoadingTrains] = useState(false);
    const [trainSearchError, setTrainSearchError] = useState('');

    // Robust Price State Synchronization
    useEffect(() => {
        if (!trainNo || !trainClass || !availableTrains) return;

        const currentTrain = availableTrains.find(t => t.train_base?.train_no === trainNo);
        if (!currentTrain) return;

        const t = currentTrain.train_base;
        const newPrice = getTicketPrice(
            source,
            destination,
            trainClass,
            t.train_name,
            t.travel_time,
            t.prices,
            customPrices,
            dynamicCorridors
        );

        if (newPrice !== selectedUnitPrice && newPrice > 0) {
            console.log(`[PricingSync] Automatically updated unit price to ₹${newPrice} for ${trainClass}`);
            setSelectedUnitPrice(newPrice);
        }
    }, [trainNo, trainClass, availableTrains, source, destination]);


    // Schedule state removed as it was unused

    // Refs for scrolling
    const passengerSectionRef = useRef<HTMLDivElement>(null);

    // Recent Stations tracking
    const [recentStations, setRecentStations] = useState<{ code: string, name: string }[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('recent_stations');
        if (stored) {
            try {
                setRecentStations(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse recent stations', e);
            }
        }
    }, []);

    useEffect(() => {
        const fetchPricesAndCorridors = async () => {
            const token = localStorage.getItem('token');
            
            // Fetch Corridors (Public)
            try {
                const corridorsRes = await axios.get('/api/corridors/public');
                const fetched = corridorsRes.data.corridors || [];
                setDynamicCorridors(fetched);
                console.log(`[Pricing] Loaded ${fetched.length} dynamic corridor rules.`);
            } catch (e) {
                console.error('Failed to fetch corridors', e);
            }

            // Fetch Price Requests (Requires Auth)
            if (token) {
                try {
                    const pricesRes = await axios.get('/api/price-requests', { headers: { Authorization: `Bearer ${token}` } });
                    setCustomPrices(pricesRes.data.filter((r: any) => r.status === 'UPDATED'));
                } catch (e) {
                    console.error('Failed to fetch price requests', e);
                }
            }
        };
        fetchPricesAndCorridors();
    }, []);

    useEffect(() => {
        if (prefillData) {
            setSource(prefillData.source || '');
            setSourceSearch(prefillData.source || '');
            setDestination(prefillData.destination || '');
            setDestinationSearch(prefillData.destination || '');
            setTrainClass(prefillData.class || '');
            setTrainNo(prefillData.trainNumber || '');
            setSelectedTrainName(prefillData.trainName || '');


            // Ensure booking state is editing
            setBookingState('editing');

            if (prefillData.price) {
                setSelectedUnitPrice(prefillData.price);
            }

            // If we have train number and name, "simulate" a search result so user can proceed
            if (prefillData.trainNumber && prefillData.trainName && prefillData.source && prefillData.destination) {
                setAvailableTrains([{
                    train_base: {
                        train_no: prefillData.trainNumber,
                        train_name: prefillData.trainName,
                        from_stn_name: prefillData.source,
                        to_stn_name: prefillData.destination,
                        from_time: "--:--",
                        to_time: "--:--",
                        travel_time: "--:--",
                        available_classes: [prefillData.class],
                        prices: prefillData.price ? { [prefillData.class]: prefillData.price } : undefined
                    }
                }]);
            }

            // Scroll to passenger section after a brief delay to allow re-render
            setTimeout(() => {
                passengerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, [prefillData]);

    const addToRecent = (station: { code: string, name: string }) => {
        const updated = [station, ...recentStations.filter(s => s.code !== station.code)].slice(0, 5);
        setRecentStations(updated);
        localStorage.setItem('recent_stations', JSON.stringify(updated));
    };

    const handleExchangeStations = () => {
        const tempSource = source;
        const tempSourceSearch = sourceSearch;

        setSource(destination);
        setSourceSearch(destinationSearch);

        setDestination(tempSource);
        setDestinationSearch(tempSourceSearch);

        // Reset train selection as the route has changed
        setTrainNo('');
        setSelectedTrainName('');

        setSelectedUnitPrice(0);
        setAvailableTrains(null);
    };

    const sourceRef = useRef<HTMLDivElement>(null);
    const destRef = useRef<HTMLDivElement>(null);

    // Date Restriction Auto-Reset (Strict 2-Day Gap / 3-Day Offset)
    useEffect(() => {
        if (!journeyDate) return;
        
        const selected = new Date(journeyDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 3);

        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 15);

        if (selected < minDate) {
            setJourneyDate('');
            setTrainSearchError(`Booking restricted. Earliest allowed: ${minDate.toLocaleDateString()} (3-Day Gap Required)`);
        } else if (selected > maxDate) {
            setJourneyDate('');
            setTrainSearchError(`Booking restricted. Maximum advance booking is 15 days (${maxDate.toLocaleDateString()}).`);
        }
    }, [journeyDate]);

    // Auto-close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isSelecting.current) return; // DON'T CLOSE IF WE ARE IN THE MIDDLE OF SELECTING

            const target = e.target as Node;
            if (!document.body.contains(target)) return;

            if (sourceRef.current && !sourceRef.current.contains(target)) setShowSourceDropdown(false);
            if (destRef.current && !destRef.current.contains(target)) setShowDestDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* closeDropdownGracefully removed as it's unused */

    /* fetchSchedule removed as it's unused */

    /* filteredSourceStations and filteredDestStations removed as they are unused */

    /* Redundant station search useEffects removed */

    const handleSearchTrains = async () => {
        console.log("[TrainSearch] Button Clicked - Starting Terminal Initialize Procedure...");
        // ✅ AUTO-RESOLUTION: If user typed but didn't select from dropdown, try to find match
        let finalSource = source;
        let finalDest = destination;

        if (!finalSource && sourceSearch) {
            const match = [...POPULAR_STATIONS, ...STATION_OVERRIDES].find(s => 
                s.name.toLowerCase() === sourceSearch.toLowerCase() || 
                s.code.toLowerCase() === sourceSearch.split('[')[1]?.split(']')[0]?.toLowerCase()
            );
            if (match) finalSource = match.code;
        }

        if (!finalDest && destinationSearch) {
            const match = [...POPULAR_STATIONS, ...STATION_OVERRIDES].find(s => 
                s.name.toLowerCase() === destinationSearch.toLowerCase() || 
                s.code.toLowerCase() === destinationSearch.split('[')[1]?.split(']')[0]?.toLowerCase()
            );
            if (match) finalDest = match.code;
        }

        if (!finalSource || !finalDest || !journeyDate) {
            setTrainSearchError("Please select Source, Destination, and Journey Date from the suggested list.");
            setAvailableTrains([]); // Clear 'Awaiting' state
            return;
        }

        // âŒ Instant Guard: Block "Intra-City" searches to prevent confusion (Frontend Sync)
        const isSameCluster = finalSource === finalDest || (FRONTEND_NEARBY_STATIONS[finalSource] || []).includes(finalDest);
        if (isSameCluster) {
            console.log(`[TrainSearch] BLOCKED: Intra-city search detected (${finalSource} -> ${finalDest})`);
            setTrainSearchError("Intra-city search is not allowed. Please choose a destination in a different city.");
            setAvailableTrains([]);
            return;
        }

        // Strict 3-day gap validation
        const selectedDate = new Date(journeyDate);
        selectedDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const minAllowedDate = new Date(today);
        minAllowedDate.setDate(today.getDate() + 3);

        const maxAllowedDate = new Date(today);
        maxAllowedDate.setDate(today.getDate() + 15);

        if (selectedDate < minAllowedDate) {
            setTrainSearchError(`Booking restricted. Earliest available date is ${minAllowedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (3-Day Gap Required)`);
            return;
        }

        if (selectedDate > maxAllowedDate) {
            setTrainSearchError(`Booking restricted. Maximum advance booking is 15 days (up to ${maxAllowedDate.toLocaleDateString()}).`);
            return;
        }
    

        setIsLoadingTrains(true);
        setTrainSearchError('');
        // NOTE: We no longer setAvailableTrains(null) here to avoid UI blank-flickering.
        setTrainNo('');


        try {
            // Format YYYY-MM-DD to DD-MM-YYYY
            const [year, month, day] = journeyDate.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            // Single refined API call (Backend now handles proximity stations)
            const url = `/api/trains/getTrainOn?from=${finalSource}&to=${finalDest}&date=${formattedDate}&class=${trainClass}`;
            const res = await axios.get(url);
            
            if (res.data.success && Array.isArray(res.data.data)) {
                const results = res.data.data;
                
                // Backend has already filtered by proximity and engine-specific rules
                const filtered = results;

                if (filtered.length > 0) {
                    setAvailableTrains(filtered);
                } else {
                    setAvailableTrains([]);
                    setTrainSearchError("No trains found for this route or nearby stations on this date.");
                }
            } else {
                setAvailableTrains([]);
                setTrainSearchError(res.data.data || "No trains found for this route.");
            }

        } catch (error) {
            console.error("Train search error:", error);
            setTrainSearchError("Error connecting to Indian Rail API.");
            setAvailableTrains([]);
        } finally {
            console.log(`[Search] Final State: Trains=${availableTrains?.length}, Error=${trainSearchError}, Loading=${isLoadingTrains}`);
            setIsLoadingTrains(false);
        }
    };

    const handleAddPassenger = () => {
        if (passengers.length >= 4) return; // Max 4 passengers
        setPassengers([...passengers, { name: '', age: '', gender: 'M' }]);
    };


    const handleRemovePassenger = (index: number) => {
        if (passengers.length <= 1) return; // Min 1 passenger
        setPassengers(passengers.filter((_, i) => i !== index));
    };

    const handlePassengerChange = (index: number, field: keyof Passenger, value: any) => {
        const newPassengers = [...passengers];
        newPassengers[index][field] = value;
        setPassengers(newPassengers);
    };




    const handleTransitionToReview = (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        
        // Final validation check before transitioning
        if (!isValidIndianMobile(mobile)) {
            alert("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
            return;
        }

        setBookingState('confirming');
        // Scroll to top of review section
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleFinalConfirm = async () => {
        setIsProcessing(true);
        setPaymentError(null);

        const token = localStorage.getItem('token');
        const user = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');

        // --- RESTRICTION CHECK ---
        if (user.status === 'RESTRICTED') {
            setPaymentError('Your account is currently restricted. You can view schedules but cannot make new bookings. Please contact support.');
            setIsProcessing(false);
            return;
        }


        // --- WALLET PAYMENT BRANCH ---
        if (paymentMethod === 'WALLET') {
            try {
                const ct = availableTrains?.find(t => t.train_base.train_no === trainNo);
                const unitPrice = getTicketPrice(source, destination, trainClass, selectedTrainName, ct?.train_base.travel_time, ct?.train_base.prices, customPrices, dynamicCorridors);
                let totalAmount = passengers.length * unitPrice;
                if (appliedCoupon) totalAmount -= appliedCoupon.discount;

                const { data } = await axios.post('/api/payments/wallet-pay', {
                    amount: totalAmount,
                    trainNo,
                    trainName: selectedTrainName,
                    fromStation: source,
                    toStation: destination,
                    journeyDate,
                    passengers: passengers.length,
                    mobile,
                    email,
                    trainClass,
                    passengerList: passengers
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });


                if (data.success) {
                    setBookingState('success');
                } else {
                    setPaymentError(data.error || 'Wallet payment failed.');
                }
            } catch (err: any) {
                console.error('Wallet payment error:', err);
                setPaymentError(err.response?.data?.error || 'Insufficient funds or wallet error.');
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // --- OFFLINE PAYMENT BRANCH (ADMIN ONLY) ---
        if (paymentMethod === 'OFFLINE') {
            try {
                const ct = availableTrains?.find(t => t.train_base.train_no === trainNo);
                const unitPrice = getTicketPrice(source, destination, trainClass, selectedTrainName, ct?.train_base.travel_time, ct?.train_base.prices, customPrices, dynamicCorridors);
                let totalAmount = passengers.length * unitPrice;
                if (appliedCoupon) totalAmount -= appliedCoupon.discount;

                const { data } = await axios.post('/api/payments/offline-pay', {
                    amount: totalAmount,
                    trainNo,
                    trainName: selectedTrainName,
                    fromStation: source,
                    toStation: destination,
                    journeyDate,
                    passengers: passengers.length,
                    mobile,
                    email,
                    trainClass,
                    passengerList: passengers
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (data.success) {
                    setBookingState('success');
                } else {
                    setPaymentError(data.error || 'Offline payment failed.');
                }
            } catch (err: any) {
                console.error('Offline payment error:', err);
                setPaymentError(err.response?.data?.error || 'Verification failed for offline booking.');
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        // --- RAZORPAY BRANCH ---
        try {
            const res = await loadRazorpay();
            if (!res) {
                setPaymentError('Razorpay SDK failed to load. Please check your internet connection.');
                setIsProcessing(false);
                return;
            }

            const ct = availableTrains?.find(t => t.train_base.train_no === trainNo);
            const unitPrice = getTicketPrice(source, destination, trainClass, selectedTrainName, ct?.train_base.travel_time, ct?.train_base.prices, customPrices, dynamicCorridors);
            let totalAmount = passengers.length * unitPrice;
            
            if (appliedCoupon) {
                totalAmount -= appliedCoupon.discount;
            }

            const token = localStorage.getItem('token');
            const axiosConfig = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const { data: orderData } = await axios.post('/api/payments/create-order', { amount: totalAmount }, axiosConfig);

            const options = {
                key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_dummykey12345",
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Tickets Pro",
                description: "Train Ticket Booking",
                order_id: orderData.orderId,
                webview_intent: true,
                modal: {
                    ondismiss: () => {
                        setPaymentError('Payment was cancelled. You can retry at any time.');
                        setIsProcessing(false);
                        recordFailedBooking('Payment Cancelled');
                    }
                },
                handler: async (response: any) => {
                    try {
                        const verifyRes = await axios.post('/api/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            trainNo,
                            trainName: selectedTrainName,
                            fromStation: source,
                            toStation: destination,
                            journeyDate,
                            passengers: passengers.length,
                            mobile,
                            email,
                            amount: totalAmount,
                            trainClass,
                            passengerList: passengers
                        }, axiosConfig);


                        if (verifyRes.data.success) {
                            setPaymentError(null);
                            setBookingState('success');
                        } else {
                            setPaymentError('Payment verification failed. Please retry or contact support.');
                        }
                    } catch (verifyErr: any) {
                        console.error('Verify error:', verifyErr);
                        setPaymentError('Booking failed: ' + (verifyErr?.response?.data?.error || 'Server error. Please try again.'));
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: passengers[0].name,
                    contact: mobile,
                },
                theme: {
                    color: "#0ea5e9",
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setPaymentError('Payment failed: ' + (response.error?.description || 'An unexpected error occurred.'));
                setIsProcessing(false);
                recordFailedBooking('Payment Failed');
            });
            rzp.open();

        } catch (error: any) {
            console.error('Checkout error:', error);
            setPaymentError('Failed to initiate booking: ' + (error?.response?.data?.error || 'Please try again.'));
            setIsProcessing(false);
        }
    };

    const handleRequestPrice = async (trainData?: any) => {
        setIsProcessing(true);
        try {
            const token = localStorage.getItem('token');
            const axiosConfig = {
                headers: { Authorization: `Bearer ${token}` }
            };
            
            // Use passed train data (from Search Results) OR fallback to component state
            const reqTrainName = trainData?.train_base?.train_name || trainData?.train_name || selectedTrainName;
            const reqTrainNo = trainData?.train_base?.train_no || trainData?.train_no || trainNo;
            const reqClass = trainClass; // Current selected class from the dropdown

            if (!reqTrainName || !reqTrainNo || !source || !destination || !reqClass) {
                console.error('[PriceRequest] Missing Fields:', { reqTrainName, reqTrainNo, source, destination, reqClass });
                alert('Please ensure Train, Route, and Class are selected before requesting price.');
                setIsProcessing(false);
                return;
            }

            await axios.post('/api/price-requests', {
                trainName: reqTrainName,
                trainNumber: reqTrainNo,
                source,
                destination,
                trainClass: reqClass
            }, axiosConfig);
            
            setIsPriceRequested(true);
        } catch (error: any) {
            console.error('Price request error:', error);
            const errorMsg = error.response?.data?.error || 'Failed to submit price request. Please try again.';
            alert(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };


    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsApplyingCoupon(true);
        setCouponError('');
        try {
            const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
            const unitPrice = selectedUnitPrice || getTicketPrice(
                source, 
                destination, 
                trainClass, 
                selectedTrainName, 
                currentTrain?.train_base?.travel_time, 
                currentTrain?.train_base?.prices,
                customPrices,
                dynamicCorridors
            );
            const bookingAmount = passengers.length * unitPrice;

            const { data } = await axios.post('/api/coupons/validate', {
                code: couponCode,
                amount: bookingAmount
            });
            setAppliedCoupon(data);
            setCouponError('');
        } catch (err: any) {
            setCouponError(err.response?.data?.error || 'Invalid coupon code');
            setAppliedCoupon(null);
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const recordFailedBooking = async (reason: string) => {
        try {
            await axios.post('/api/failed-bookings', {
                name: passengers[0].name,
                email,
                mobile,
                trainName: selectedTrainName,
                trainNumber: trainNo,
                source,
                destination,
                journeyDate,
                trainClass,
                reason
            });
            console.log(`[Tickets Pro] Lead captured: ${reason}`);
        } catch (e) {
            console.error('Failed to capture lead', e);
        }
    };

    const clearPersistence = () => {
        [
            'tp_trainNo', 'tp_selectedTrainName', 'tp_trainClass', 'tp_source', 
            'tp_destination', 'tp_sourceSearch', 'tp_destinationSearch', 
            'tp_journeyDate', 'tp_mobile', 'tp_email', 'tp_passengers', 
            'tp_selectedUnitPrice', 'tp_couponCode', 'tp_appliedCoupon'
        ].forEach(key => localStorage.removeItem(key));
    };

    const handleReset = () => {
        setTrainNo('');
        setSelectedTrainName('');
        setSource('');
        setSourceSearch('');
        setDestination('');
        setDestinationSearch('');
        setJourneyDate('');
        setMobile('');
        setTrainClass('');
        setPassengers([{ name: '', age: '', gender: 'M' }]);
        setAppliedCoupon(null);
        setCouponCode('');
        setSelectedUnitPrice(0);

        setAvailableTrains(null);
        setTrainSearchError('');
        setBookingState('editing');
        clearPersistence();
    };

    if (bookingState === 'confirming') {
        return (
            <div className="card relative overflow-hidden mb-8 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 animate-in fade-in zoom-in-95 duration-300">
                <div className="absolute left-0 top-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                    <div className="p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Confirm Booking Details</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Action Required: Verify and Submit</p>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">Journey Route</p>
                            <p className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2"><Train size={18} className="text-brand-blue" /> {trainNo} - {selectedTrainName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">Date</p>
                            <p className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2"><Calendar size={18} className="text-brand-blue" /> {formatDateDDMMYY(journeyDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">From &rarr; To</p>
                            <p className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2"><MapPin size={18} className="text-brand-blue" /> {sourceSearch} &rarr; {destinationSearch}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">Contact Mobile</p>
                            <p className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2"><Phone size={18} className="text-brand-blue" /> {mobile}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">Email ID</p>
                            <p className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2 truncate"><Mail size={18} className="text-brand-blue" /> {email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 underline decoration-slate-300 underline-offset-4">Total Fare ({trainClass})</p>
                            <p className="text-brand-blue font-black text-2xl flex items-center gap-1 italic">
                                ₹{(() => {
                                    const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                                    const unitPrice = getTicketPrice(
                                        source, 
                                        destination, 
                                        trainClass, 
                                        selectedTrainName, 
                                        currentTrain?.train_base?.travel_time, 
                                        currentTrain?.train_base?.prices,
                                        customPrices,
                                        dynamicCorridors
                                    );
                                    return ((unitPrice * passengers.length) - (appliedCoupon?.discount || 0)).toLocaleString();
                                })()}
                                {appliedCoupon && (
                                    <span className="text-[10px] text-emerald-400 line-through ml-1 opacity-50">
                                        ₹{(() => {
                                            const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                                            const unitPrice = getTicketPrice(
                                                source, 
                                                destination, 
                                                trainClass, 
                                                selectedTrainName, 
                                                currentTrain?.train_base?.travel_time, 
                                                currentTrain?.train_base?.prices,
                                                customPrices,
                                                dynamicCorridors
                                            );
                                            return (unitPrice * passengers.length).toLocaleString();
                                        })()}
                                    </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-normal uppercase ml-1">({passengers.length} Pax)</span>
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-900/30 p-5 rounded-2xl border border-slate-700/30">
                        <p className="text-sm text-slate-500 mb-3 flex items-center gap-2"><Users size={16} /> Passengers ({passengers.length})</p>
                        <div className="space-y-2">
                            {passengers.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white dark:bg-emerald-500/5 p-4 rounded-2xl border border-slate-200 dark:border-emerald-500/20 group hover:border-brand-blue transition-all">
                                    <span className="text-slate-900 dark:text-white font-black text-base">{i + 1}. {p.name}</span>
                                    <span className="text-slate-500 dark:text-emerald-400 text-xs font-black uppercase tracking-widest">{p.age} years</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coupon Section */}
                    <div className="bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest"><Tags size={16} className="text-brand-blue" /> Apply Sales Coupon</p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="Enter code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                disabled={!!appliedCoupon}
                                className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white font-black text-lg placeholder:text-slate-300 outline-none focus:border-brand-blue transition-all"
                            />
                            {appliedCoupon ? (
                                <button 
                                    onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                                    className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all"
                                >
                                    Remove
                                </button>
                            ) : (
                                <button 
                                    onClick={handleApplyCoupon}
                                    disabled={isApplyingCoupon || !couponCode}
                                    className="bg-brand-blue text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50 transition-all"
                                >
                                    {isApplyingCoupon ? '...' : 'Apply'}
                                </button>
                            )}
                        </div>
                        {couponError && <p className="text-rose-400 text-[10px] mt-2 font-bold ml-1">{couponError}</p>}
                        {appliedCoupon && (
                            <div className="mt-3 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle2 size={14} /> Coupon Applied!
                                </span>
                                <span className="text-emerald-400 text-sm font-black">- â‚¹{appliedCoupon.discount}</span>
                            </div>
                        )}
                    </div>

                    {/* Payment Method Selection */}
                    <div className="bg-slate-50 dark:bg-black/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-500 mb-5 flex items-center gap-2 uppercase tracking-[0.25em]">Gateway Selection</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Razorpay Option */}
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('RAZORPAY')}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                                    paymentMethod === 'RAZORPAY'
                                        ? 'border-brand-blue bg-brand-blue/10'
                                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${paymentMethod === 'RAZORPAY' ? 'bg-brand-blue text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        <IndianRupee size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-slate-900 dark:text-white font-black text-base tracking-tight">Razorpay</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">UPI / Card / NetBanking</p>
                                    </div>
                                </div>
                                {paymentMethod === 'RAZORPAY' && <CheckCircle2 size={16} className="text-brand-blue" />}
                            </button>

                            {/* Wallet Option */}
                            {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CUSTOMER') && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('WALLET')}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                                        paymentMethod === 'WALLET'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${paymentMethod === 'WALLET' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            {isFetchingWallet ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-bold text-sm tracking-tight">Wallet Balance</p>
                                            <p className={`text-[9px] font-bold uppercase tracking-wider ${(() => {
                                                const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                                                const unitPrice = selectedUnitPrice || getTicketPrice(
                                                    source, 
                                                    destination, 
                                                    trainClass, 
                                                    selectedTrainName, 
                                                    currentTrain?.train_base?.travel_time, 
                                                    currentTrain?.train_base?.prices
                                                );
                                                return walletBalance < ((unitPrice * passengers.length) - (appliedCoupon?.discount || 0));
                                            })() ? 'text-rose-400' : 'text-emerald-500'}`}>
                                                Bal: ₹{walletBalance.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {paymentMethod === 'WALLET' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                </button>
                            )}

                            {/* Offline Option (Admin Only) */}
                            {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('OFFLINE')}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                                        paymentMethod === 'OFFLINE'
                                            ? 'border-rose-500 bg-rose-500/10'
                                            : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${paymentMethod === 'OFFLINE' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-bold text-sm tracking-tight">Offline (Test)</p>
                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Admin Testing Only</p>
                                        </div>
                                    </div>
                                    {paymentMethod === 'OFFLINE' && <CheckCircle2 size={16} className="text-rose-500" />}
                                </button>
                            )}
                        </div>

                        {paymentMethod === 'WALLET' && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CUSTOMER') && (() => {
                            const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                            const unitPrice = selectedUnitPrice || getTicketPrice(
                                source, 
                                destination, 
                                trainClass, 
                                selectedTrainName, 
                                currentTrain?.train_base.travel_time, 
                                currentTrain?.train_base.prices
                            );
                            return walletBalance < ((unitPrice * passengers.length) - (appliedCoupon?.discount || 0));
                        })() && (
                            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                                <AlertTriangle className="text-rose-500" size={14} />
                                <p className="text-rose-400 text-[10px] font-bold uppercase">Insufficient Wallet Balance for this booking.</p>
                            </div>
                        )}
                    </div>


                    {/* Payment Error / Retry Banner */}
                    {paymentError && (
                        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertCircle size={16} className="text-rose-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-rose-300 font-semibold text-sm">Payment {paymentError.toLowerCase().includes('cancel') ? 'Cancelled' : 'Failed'}</p>
                                <p className="text-rose-200/70 text-xs mt-0.5 leading-relaxed">{paymentError}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50 mt-4">
                        <button
                            type="button"
                            onClick={() => { setBookingState('editing'); setPaymentError(null); }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={18} /> Edit Details
                        </button>
                        <button
                            type="button"
                            onClick={handleFinalConfirm}
                            disabled={isProcessing}
                            className={`${paymentError
                                    ? 'bg-gradient-to-r from-brand-orange/80 to-brand-orange hover:from-brand-orange hover:to-brand-orange/80 shadow-brand-orange/25'
                                    : 'bg-gradient-to-r from-brand-teal to-brand-blue hover:from-brand-blue hover:to-brand-teal shadow-brand-teal/25'
                                } text-white font-semibold flex items-center gap-2 py-2.5 px-8 rounded-xl shadow-lg transition-all transform ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                        >
                            {isProcessing
                                ? <><Loader2 size={18} className="animate-spin" /> Connecting Gateway...</>
                                : paymentError
                                    ? <><ArrowLeftRight size={18} /> Retry Payment</>
                                    : paymentMethod === 'WALLET'
                                        ? 'Pay via Wallet & Book'
                                        : 'Confirm & Pay'
                            }
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (bookingState === 'success') {
        return (
            <div className="card text-center py-16 mb-8 border border-slate-700/50 bg-surface/50 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-2xl holographic-glow">
                    <img src={brandLogo} alt="Logo" className="w-20 h-20 object-contain" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-3">Ticket Request Received!</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">Your journey on Train {trainNo} ({trainClass}) is successfully Request Received for {formatDateDDMMYY(journeyDate)}. You will receive an SMS confirmation on {mobile}.</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => { clearPersistence(); handleReset(); }}
                        className="bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-brand-blue text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-brand-blue/25 transition-all transform hover:-translate-y-0.5"
                    >
                        Book Another Ticket
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
        <form 
            className="bg-transparent relative group mb-8 animate-in fade-in duration-300"
        >
            {/* Progress Bar for Search Phase */}
            <div className="px-6 md:px-10 max-w-5xl mx-auto w-full mb-8">
                <div className="w-full h-1 bg-slate-200 rounded-full mb-8 overflow-hidden">
                    <div className={`dynamic-progress h-full rounded-full shadow-[0_0_8px_rgba(14,165,233,0.5)] transition-all duration-1000 ${isLoadingTrains ? 'w-[65%]' : availableTrains?.length ? 'w-[100%]' : 'w-[20%]'}`}></div>
                </div>
                <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg border border-slate-200 dark:border-white/10">
                        <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-1 w-4 rounded-full bg-brand-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">Reservation System</span>
                        </div>
                        <h3 className="font-headline text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Transit <span className="text-brand-blue">Node</span> Search</h3>
                    </div>
                </div>
            </div>
                    <p className="text-slate-500 font-body text-sm">Initialize booking parameters for terminal-to-terminal travel.</p>
                </div>
            </div>

            {/* Bento Search Grid */}
            <div className="px-6 md:px-10 max-w-5xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Location Input Node */}
                    <div className="md:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative group">
                        <div className="absolute inset-0 scanline-overlay opacity-5 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                {/* From Station */}
                                <div className="w-full flex flex-col relative" ref={sourceRef}>
                                    <label className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2 ml-1">From Station</label>
                                    <div className={`flex items-center gap-3 bg-slate-50 border transition-all p-3 rounded-xl ${showSourceDropdown ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'}`}>
                                        <span className="material-symbols-outlined text-slate-400">location_on</span>
                                        <input 
                                            className="bg-transparent border-none focus:ring-0 text-slate-900 font-headline text-lg w-full placeholder:text-slate-300 uppercase" 
                                            placeholder="FROM" 
                                            type="text" 
                                            value={sourceSearch}
                                            onChange={(e) => {
                                                setSourceSearch(e.target.value);
                                                setSource('');
                                                setShowSourceDropdown(true);
                                            }}
                                            onFocus={() => setShowSourceDropdown(true)}
                                            required={false}
                                        />
                                    </div>
                                    {showSourceDropdown && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden z-[100]">
                                            <StationDropdown 
                                                search={sourceSearch} 
                                                stations={sourceStations}
                                                loading={isSearchingSource}
                                                onSelect={(stn) => { 
                                                    setSource(stn.code); 
                                                    setSourceSearch(`${stn.name} [${stn.code}]`); 
                                                    setShowSourceDropdown(false); 
                                                    addToRecent(stn); 
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>

                                <div 
                                    onClick={handleExchangeStations}
                                    className="bg-primary/5 p-3 rounded-full border border-primary/20 text-primary hover:bg-primary/10 active:scale-90 transition-all cursor-pointer shadow-sm shrink-0"
                                >
                                    <span className="material-symbols-outlined">sync_alt</span>
                                </div>

                                {/* To Station */}
                                <div className="w-full flex flex-col relative" ref={destRef}>
                                    <label className="text-[10px] uppercase tracking-widest text-primary font-bold mb-2 ml-1">To Station</label>
                                    <div className={`flex items-center gap-3 bg-slate-50 border transition-all p-3 rounded-xl ${showDestDropdown ? 'border-primary ring-2 ring-primary/10' : 'border-slate-200'}`}>
                                        <span className="material-symbols-outlined text-slate-400">near_me</span>
                                        <input 
                                            className="bg-transparent border-none focus:ring-0 text-slate-900 font-headline text-lg w-full placeholder:text-slate-300 uppercase" 
                                            placeholder="TO" 
                                            type="text" 
                                            value={destinationSearch}
                                            onChange={(e) => {
                                                setDestinationSearch(e.target.value);
                                                setDestination('');
                                                setShowDestDropdown(true);
                                            }}
                                            onFocus={() => setShowDestDropdown(true)}
                                            required={false}
                                        />
                                    </div>
                                    {showDestDropdown && (
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                                            <StationDropdown 
                                                search={destinationSearch} 
                                                stations={destStations}
                                                loading={isSearchingDest}
                                                onSelect={(stn) => {
                                                    setDestination(stn.code);
                                                    setDestinationSearch(`${stn.name} [${stn.code}]`);
                                                    setShowDestDropdown(false);
                                                    addToRecent(stn);
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Action Node */}
                    <div className="md:col-span-4 bg-primary rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-sky-200 relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                        <div className="relative z-10">
                            <label className="text-[10px] uppercase tracking-widest text-white/70 font-bold mb-2 block">Journey Date</label>
                            <div className="flex items-center gap-3 border-b border-white/20 py-2">
                                <span className="material-symbols-outlined text-white">calendar_today</span>
                                <input 
                                    type="date"
                                    value={journeyDate}
                                    onChange={(e) => setJourneyDate(e.target.value)}
                                    min={(() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 3);
                                        return d.toISOString().split('T')[0];
                                    })()}
                                    className="bg-transparent border-none focus:ring-0 text-white font-headline text-xl w-full p-0 placeholder:text-white/20"
                                />
                            </div>
                        </div>
                        {trainSearchError && (
                            <div className="mb-4 animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-white text-xs font-black text-center uppercase tracking-widest bg-rose-500 py-3 rounded-xl shadow-lg border-2 border-white/20">
                                    {trainSearchError}
                                </p>
                            </div>
                        )}
                        <button 
                            type="button"
                            onClick={handleSearchTrains}
                            disabled={isLoadingTrains}
                            className="relative z-10 bg-white text-primary py-4 rounded-xl font-bold tracking-widest uppercase text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 w-full"
                        >
                            {isLoadingTrains ? 'Searching...' : 'Search Trains'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="h-px bg-white/5 mb-12 shadow-[0_1px_0_rgba(255,255,255,0.02)]" />
            </div>


            <div className="mx-8 h-px bg-slate-800/50 mb-10" />

            {/* Train Results List */}
            {availableTrains && availableTrains.length > 0 && (
                <div className="mt-12 space-y-6 px-6 md:px-10 max-w-5xl mx-auto w-full">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Available Trains ({availableTrains.length})</h4>
                        <div className="flex gap-4 text-[10px] font-bold tracking-wider">
                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded">FASTEST</span>
                            <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">CHEAPEST</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {availableTrains.map((train, idx) => {
                            const t = train.train_base;
                            const isSelected = trainNo === t.train_no;
                            const price = getTicketPrice(source, destination, trainClass, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                            
                            return (
                                <div 
                                    key={idx}
                                    onClick={() => {
                                        setTrainNo(t.train_no);
                                        setSelectedTrainName(t.train_name);
                                        setSelectedUnitPrice(price);
                                    }}
                                    className={`train-card bg-white border rounded-2xl overflow-hidden group transition-all shadow-sm hover:shadow-md cursor-pointer ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-primary/30'}`}
                                >
                                    <div className="flex flex-col md:flex-row">
                                        <div className="p-6 flex-1 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <h5 className="text-slate-900 font-headline text-xl">{t.train_name}</h5>
                                                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">ID: {t.train_no} {'\u2022'} {t.train_type || 'Express'}</p>
                                                    </div>
                                                    <div className="bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-600 border border-emerald-100">ON TIME</div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between gap-4 mt-2">
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold text-slate-500 mb-1 truncate max-w-[120px]" title={t.from_stn_name || source}>{t.from_stn_name || source}</div>
                                                        <div className="text-headline text-2xl text-slate-900">{t.from_time}</div>
                                                        {t.departure_date_friendly && (
                                                            <span className="text-[9px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/20 px-1.5 py-0.5 rounded border border-sky-100 dark:border-sky-900/30 mt-1 inline-block">
                                                                {t.departure_date_friendly}
                                                            </span>
                                                        )}
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Departure</div>
                                                    </div>
                                                    
                                                    <div className="flex-1 flex flex-col items-center gap-1">
                                                        <span className="text-[10px] font-mono text-primary font-bold">{t.travel_time}</span>
                                                        <div className="flex items-center w-full gap-2 px-4">
                                                            <div className="h-0.5 flex-1 bg-slate-100 rounded-full relative">
                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                                            </div>
                                                            <span className="material-symbols-outlined text-primary text-sm font-bold">train</span>
                                                            <div className="h-0.5 flex-1 bg-slate-100 rounded-full relative">
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); fetchSchedule(t); }}
                                                            className="text-[9px] text-primary hover:text-sky-600 font-bold uppercase tracking-widest mt-1 hover:underline flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[10px]">schedule</span>
                                                            Schedule
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold text-slate-500 mb-1 truncate max-w-[120px]" title={t.to_stn_name || destination}>{t.to_stn_name || destination}</div>
                                                        <div className="text-headline text-2xl text-slate-900">{t.to_time}</div>
                                                        {t.arrival_date_friendly && (
                                                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30 mt-1 inline-block">
                                                                {t.arrival_date_friendly}
                                                            </span>
                                                        )}
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Arrival</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50/50 md:w-[350px] border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-between gap-4">
                                             <div className={`grid ${(() => {
                                                 const classesToShow = getClassesToShow(t.available_classes, t.train_name, t.train_no, t.train_type).filter(clsCode => {
                                                     if (clsCode === '1A') {
                                                         const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                                         return p > 0;
                                                     }
                                                     return true;
                                                 });
                                                 return classesToShow.length === 1 ? 'grid-cols-1' : classesToShow.length === 2 ? 'grid-cols-2' : classesToShow.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
                                             })()} gap-2`}>
                                                 {(() => {
                                                     const classesToShow = getClassesToShow(t.available_classes, t.train_name, t.train_no, t.train_type).filter(clsCode => {
                                                         if (clsCode === '1A') {
                                                             const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                                             return p > 0;
                                                         }
                                                         return true;
                                                     });

                                                     return classesToShow.map(clsCode => {
                                                         const isClsSelected = trainClass === clsCode && isSelected;
                                                         
                                                         return (
                                                             <div 
                                                                 key={clsCode}
                                                                 onClick={(e) => { 
                                                                     e.stopPropagation(); 
                                                                     setTrainClass(clsCode); 
                                                                     setTrainNo(t.train_no); 
                                                                     setSelectedTrainName(t.train_name);
                                                                     const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                                                     if (p > 0) setSelectedUnitPrice(p);
                                                                 }}
                                                                 className={`p-2 rounded-xl border shadow-sm cursor-pointer transition-all flex flex-col justify-between h-full min-h-[64px] ${isClsSelected ? 'bg-white border-primary/20 ring-1 ring-primary/30' : 'bg-slate-100/50 border-slate-100 opacity-70 hover:opacity-100'}`}
                                                             >
                                                                 <p className="text-[7.5px] text-slate-400 font-bold uppercase mb-0.5">{TRAIN_CLASS_LABELS[clsCode] || clsCode}</p>
                                                                 {(() => { 
                                                                     const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors); 
                                                                     return p > 0 ? <p className={`text-sm font-black mt-auto ${isClsSelected ? 'text-primary' : 'text-slate-700'}`}>{'₹'}{p}</p> : <p className="text-[9px] font-bold text-amber-500 mt-auto">On Request</p>; 
                                                                 })()}
                                                             </div>
                                                         );
                                                     });
                                                 })()}
                                             </div>
                                             <button 
                                                 type="button"
                                                 onClick={(e) => { e.stopPropagation(); setTrainNo(t.train_no); setSelectedTrainName(t.train_name); }}
                                                 className={`w-full py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all active:scale-95 ${isSelected ? 'bg-primary text-white shadow-lg shadow-sky-100 hover:bg-sky-600' : 'border border-primary/30 text-primary hover:bg-primary/5'}`}
                                             >
                                                 {isSelected ? 'Train Selected' : 'Select Train'}
                                             </button>
                                         </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Passengers Section */}
            <div className={`relative z-[70] transition-all duration-500 mt-12 px-6 md:px-10 max-w-5xl mx-auto w-full ${!trainNo ? 'opacity-40 pointer-events-none select-none' : ''}`} ref={passengerSectionRef}>
                {!trainNo && (
                    <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
                        <span className="material-symbols-outlined text-amber-500">lock</span>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Please select a train above before filling passenger details</p>
                    </div>
                )}
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-8 relative overflow-hidden">
                    <div className="absolute inset-0 scanline-overlay opacity-5 pointer-events-none"></div>
                    <div className="relative z-10 flex items-center justify-between gap-3 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 font-headline flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                Node Occupants
                            </h3>
                            <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">Configure passenger parameters for transit</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                                {passengers.length}/4 OCCUPANTS
                            </span>
                            <button
                                type="button"
                                onClick={handleAddPassenger}
                                disabled={passengers.length >= 4}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                                    passengers.length >= 4
                                        ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                        : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                {passengers.length >= 4 ? 'MAX REACHED' : 'Add Occupant'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {passengers.map((passenger, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-6 items-start md:items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 group transition-all hover:border-primary/20 hover:bg-sky-50/30 relative z-10">
                                <div className="flex-1 w-full space-y-2">
                                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Identity Tag (Aadhaar Name)</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">fingerprint</span>
                                        <input
                                            type="text"
                                            value={passenger.name}
                                            onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                                            required
                                            maxLength={16}
                                            placeholder="ENTER NAME"
                                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 font-headline font-bold placeholder:text-slate-300 outline-none focus:border-primary ring-primary/10 focus:ring-4 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="w-full md:w-24 space-y-2">
                                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Age</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={passenger.age}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 3) handlePassengerChange(index, 'age', val);
                                        }}
                                        required
                                        placeholder="AGE"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-headline font-bold placeholder:text-slate-300 outline-none focus:border-primary ring-primary/10 focus:ring-4 transition-all text-center"
                                    />
                                </div>
                                <div className="w-full md:w-48 space-y-2">
                                    <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Gender Node</label>
                                    <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                                        {(['M', 'F', 'O'] as const).map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => handlePassengerChange(index, 'gender', g)}
                                                className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                                                    passenger.gender === g 
                                                        ? 'bg-primary text-white shadow-sm' 
                                                        : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                {g === 'M' ? 'MALE' : g === 'F' ? 'FEMALE' : 'X'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {passengers.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePassenger(index); }}
                                        className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

                {/* Contact Details */}
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-8 px-6 md:px-10 max-w-5xl mx-auto w-full">
                    <h3 className="text-xl font-bold text-slate-900 font-headline flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-primary">contact_mail</span>
                        Comms Channels
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Mobile Uplink</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">phone_iphone</span>
                                <input
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) {
                                            setMobile(val);
                                        }
                                    }}
                                    required
                                    placeholder="MOBILE_ID"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 font-headline font-bold placeholder:text-slate-300 outline-none focus:border-primary ring-primary/10 focus:ring-4 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Data Recipient (Email)</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">alternate_email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="RECIPIENT_ADDR"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 font-headline font-bold placeholder:text-slate-300 outline-none focus:border-primary ring-primary/10 focus:ring-4 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Emergency Booking Note */}
                {trainNo.startsWith('TAT') && (
                    <div className="mx-6 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 animate-in slide-in-from-bottom-2 duration-500">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="text-amber-400" size={20} />
                        </div>
                        <div>
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-amber-500/60 mb-1">
                                Emergency Booking Note
                            </h4>
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                                This booking is being processed as an <span className="text-amber-200 font-bold underline decoration-amber-500/30">Emergency Booking</span> reservation. 
                                <span className="block mt-1 font-bold">No cancellations or modifications are allowed for Emergency Booking tickets after booking.</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Final Action Area */}
                <div className="relative z-10 flex justify-center md:justify-end mt-12 mb-20 px-6 md:px-10 max-w-5xl mx-auto w-full">
                    {availableTrains === null ? (
                        <div className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em] bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100">
                            Awaiting Terminal Initialization
                        </div>
                    ) : availableTrains.length === 0 ? (
                        <div className="text-rose-500 text-[10px] font-bold uppercase tracking-[0.3em] bg-rose-50 px-8 py-4 rounded-2xl border border-rose-100 flex items-center gap-2 animate-pulse">
                            <span className="material-symbols-outlined text-sm">error</span>
                            No Trains Found on this Route
                        </div>
                    ) : (() => {
                        const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                        return getTicketPrice(
                            source, 
                            destination, 
                            trainClass, 
                            selectedTrainName, 
                            currentTrain?.train_base?.travel_time, 
                            currentTrain?.train_base?.prices,
                            customPrices,
                            dynamicCorridors
                        );
                    })() > 0 ? (
                        <button
                            type="button"
                            onClick={handleTransitionToReview}
                            disabled={!trainNo || !trainClass || passengers.some(p => !p.name || !p.age) || !isValidIndianMobile(mobile)}
                            className="bg-primary text-white font-bold py-5 px-16 rounded-2xl shadow-xl shadow-sky-100 hover:shadow-sky-200 transition-all w-full md:w-auto md:min-w-[320px] flex items-center justify-center gap-3 transform disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 uppercase tracking-[0.2em] text-sm active:scale-95"
                        >
                            <span className="material-symbols-outlined">rocket_launch</span> Review & Initialize Booking
                        </button>
                    ) : isPriceRequested ? (
                        <div className="bg-emerald-50 text-emerald-600 border border-emerald-100 py-5 px-16 rounded-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-widest w-full md:w-auto text-center justify-center shadow-sm">
                            <span className="material-symbols-outlined">task_alt</span> Sync Request Transmitted
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleRequestPrice}
                            disabled={isProcessing || !trainNo || !trainClass}
                            className="bg-amber-500 text-white font-bold py-5 px-16 rounded-2xl shadow-xl shadow-amber-100 hover:shadow-amber-200 transition-all w-full md:w-auto md:min-w-[320px] flex items-center justify-center gap-3 transform disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 uppercase tracking-[0.2em] text-sm active:scale-95"
                        >
                            {isProcessing ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">request_quote</span>}
                            Request Pricing Node
                        </button>
                    )}
                </div>

        </form>
            {/* Schedule Modal */}
            {showSchedule && (
                <div 
                    onClick={() => setShowSchedule(false)}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-white/10 cursor-default"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">schedule</span>
                                    {selectedTrainForSchedule?.train_name}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                                    Train #{selectedTrainForSchedule?.train_no} • Time Table
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowSchedule(false)}
                                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-sm active:scale-95"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30 dark:bg-slate-900">
                            {loadingSchedule ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Time Table...</span>
                                </div>
                            ) : scheduleData.length > 0 ? (
                                <div className="space-y-4">
                                    {scheduleData.map((stop: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-4 group">
                                            <div className="flex flex-col items-center mt-2">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ring-2 ${stop.isHalt ? 'bg-primary ring-primary/20 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-slate-300 ring-slate-100 dark:ring-slate-800'}`}></div>
                                                {idx !== scheduleData.length - 1 && <div className="w-0.5 h-16 bg-slate-200 dark:bg-white/5 group-hover:bg-primary/30 transition-colors mt-1"></div>}
                                            </div>
                                            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm group-hover:border-primary/20 group-hover:shadow-md transition-all">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                        {stop.stationName} 
                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-primary border border-slate-200 dark:border-white/10">{stop.stationCode}</span>
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg">Day {stop.day} • {stop.distance} KM</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{stop.arrivalTime === '--:--' ? 'Starts' : stop.arrivalTime}</p>
                                                    </div>
                                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{stop.departureTime === '--:--' ? 'Ends' : stop.departureTime}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-4xl">error</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Schedule data synchronized but empty</span>
                                    <button onClick={() => setShowSchedule(false)} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">Close Terminal</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
