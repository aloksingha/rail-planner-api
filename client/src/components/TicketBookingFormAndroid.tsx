// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { POPULAR_STATIONS, STATION_OVERRIDES, FRONTEND_NEARBY_STATIONS } from '../utils/constants';
import { TRAIN_CLASS_LABELS, getClassesToShow, getTicketPrice, resolveToCode } from '../utils/trainUtils';
import { Train, MapPin, Phone, Users, Calendar, CheckCircle2, ArrowLeft, Ticket, Loader2, AlertCircle, ArrowLeftRight, Tags, Mail, IndianRupee, AlertTriangle, Wallet } from 'lucide-react';
import brandLogo from '../assets/brand_logo.png';
import axios from 'axios';
// import Datepicker from "react-tailwindcss-datepicker"; // Removed due to production visibility issues
import { isValidIndianMobile } from '../utils/validation';

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





const STATION_DROPDOWN_STYLES = "max-h-[400px] overflow-y-auto custom-scrollbar";

function StationDropdown({ search, stations, loading, onSelect }: { search: string; stations: any[]; loading: boolean; onSelect: (stn: any) => void }) {
    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Searching Stations...</span>
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
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-4 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 group"
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-brand-blue font-black text-xs border border-slate-200 dark:border-white/10 group-hover:scale-110 transition-transform uppercase">
                        {stn.code.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-slate-900 dark:text-white text-base">{stn.name}</span>
                        <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">{stn.code} Station</span>
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
    const [route, setRoute] = useState('');
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
        if (sourceSearch.length < 2 || sourceSearch.includes('[')) {
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
        if (destinationSearch.length < 2 || destinationSearch.includes('[')) {
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

        const currentTrain = availableTrains.find(t => (t.train_no === trainNo) || (t.train_base?.train_no === trainNo));
        if (!currentTrain) return;

        const t = currentTrain.train_base || currentTrain;
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
            console.log(`[PricingSync:Android] Automatically updated unit price to ₹${newPrice} for ${trainClass}`);
            setSelectedUnitPrice(newPrice);
        }
    }, [trainNo, trainClass, availableTrains, source, destination]);

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
            setRoute(prefillData.trainName || '');

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
        setRoute('');
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

        // â Œ Instant Guard: Block "Intra-City" searches to prevent confusion (Frontend Sync)
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
        setRoute('');

        try {
            console.log("[TrainSearch] Request Payload Building...");
            console.log({ source: finalSource, destination: finalDest, journeyDate, trainClass });

            // Format YYYY-MM-DD to DD-MM-YYYY
            const [year, month, day] = journeyDate.split('-');
            const formattedDate = `${day}-${month}-${year}`;

            console.log(`[TrainSearch] Formatted Date for API: ${formattedDate}`);

            // Single refined API call (Backend now handles proximity stations)
            const url = `/api/trains/getTrainOn?from=${finalSource}&to=${finalDest}&date=${formattedDate}&class=${trainClass}`;
            console.log(`[TrainSearch] GET ${url}`);

            const res = await axios.get(url);
            console.log("[TrainSearch] API Response Received:", res.data);
            
            if (res.data.success && Array.isArray(res.data.data)) {
                const results = res.data.data;
                console.log(`[TrainSearch] Found ${results.length} trains.`);
                
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
                console.warn("[TrainSearch] Search failed or returned no data:", res.data.data);
            }

        } catch (error: any) {
            console.error("Train search error:", error);
            console.error("Error Detail:", error.response?.data || error.message);
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
                const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                const unitPrice = getTicketPrice(
                    source, 
                    destination, 
                    trainClass, 
                    selectedTrainName, 
                    currentTrain?.train_base?.travel_time, 
                    currentTrain?.train_base?.prices
                );
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
                const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                const unitPrice = getTicketPrice(
                    source, 
                    destination, 
                    trainClass, 
                    selectedTrainName, 
                    currentTrain?.train_base?.travel_time, 
                    currentTrain?.train_base?.prices
                );
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

            const currentTrain = availableTrains?.find(t => (t.train_no === trainNo) || (t.train_base?.train_no === trainNo));
            const unitPrice = getTicketPrice(
                source, 
                destination, 
                trainClass, 
                selectedTrainName, 
                currentTrain?.travel_time || currentTrain?.train_base?.travel_time, 
                currentTrain?.train_base?.prices,
                customPrices,
                dynamicCorridors
            );
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
            const unitPrice = selectedUnitPrice || getTicketPrice(source, destination, trainClass, selectedTrainName, availableTrains?.find(t => t.train_base.train_no === trainNo)?.train_base.travel_time, availableTrains?.find(t => t.train_base.train_no === trainNo)?.train_base.prices, customPrices, dynamicCorridors);
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
        setRoute('');
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
            <div className="glass-panel relative overflow-hidden mb-8 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/80 rounded-2xl animate-in fade-in zoom-in-95 duration-300 shadow-[0_0_30px_rgba(14,165,233,0.15)]">
                <div className="absolute top-0 right-0 p-4">
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-brand-blue rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-brand-blue/50 rounded-full"></div>
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-slate-100 dark:border-white/5 pb-4 p-6 bg-slate-50 dark:bg-slate-900/50">
                    <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-xl border border-brand-blue/20">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Review Ticket Selection</h2>
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Verify details and complete payment</p>
                    </div>
                </div>
                <div className="relative z-10 space-y-6 px-6 pb-6">
                    {/* Details Grid */}
                    <div className="grid grid-cols-1 gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Train</span>
                            <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight">{trainNo} - {selectedTrainName}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</span>
                            <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight">{formatDateDDMMYY(journeyDate)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Route</span>
                            <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight">{source} &rarr; {destination}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Amount ({trainClass})</span>
                            <div className="text-right">
                                <span className="text-brand-blue font-black text-xl tracking-tight flex items-center gap-1">
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
                                        <span className="text-[10px] text-emerald-500 line-through ml-1 opacity-50">
                                            ₹{(() => {
                                                const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                                                const unitPrice = getTicketPrice(
                                                    source, 
                                                    destination, 
                                                    trainClass, 
                                                    selectedTrainName, 
                                                    currentTrain?.train_base?.travel_time, 
                                                    currentTrain?.train_base?.prices
                                                );
                                                return (unitPrice * passengers.length).toLocaleString();
                                            })()}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest block">{passengers.length} Passengers</span>
                            </div>
                        </div>
                    </div>

                    {/* Gateway Selection */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">Gateway Selection</p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('RAZORPAY')}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                    paymentMethod === 'RAZORPAY'
                                        ? 'border-brand-blue bg-brand-blue/10'
                                        : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${paymentMethod === 'RAZORPAY' ? 'bg-brand-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        <IndianRupee size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Razorpay</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">UPI / Card / NetBanking</p>
                                    </div>
                                </div>
                                {paymentMethod === 'RAZORPAY' && <CheckCircle2 size={16} className="text-brand-blue" />}
                            </button>

                            {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'CUSTOMER') && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('WALLET')}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                        paymentMethod === 'WALLET'
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${paymentMethod === 'WALLET' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {isFetchingWallet ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Wallet Balance</p>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${(() => {
                                                const currentTrain = availableTrains?.find(t => t.train_base?.train_no === trainNo);
                                                const unitPrice = getTicketPrice(
                                                    source, 
                                                    destination, 
                                                    trainClass, 
                                                    selectedTrainName, 
                                                    currentTrain?.train_base?.travel_time, 
                                                    currentTrain?.train_base?.prices
                                                );
                                                return walletBalance < ((unitPrice * passengers.length) - (appliedCoupon?.discount || 0));
                                            })() ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                Bal: ₹{walletBalance.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {paymentMethod === 'WALLET' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                </button>
                            )}

                            {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('OFFLINE')}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                                        paymentMethod === 'OFFLINE'
                                            ? 'border-rose-500 bg-rose-500/10'
                                            : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${paymentMethod === 'OFFLINE' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <AlertTriangle size={16} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-slate-900 dark:text-white font-black text-sm tracking-tight">Offline Payment</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Admin Test Only</p>
                                        </div>
                                    </div>
                                    {paymentMethod === 'OFFLINE' && <CheckCircle2 size={16} className="text-rose-500" />}
                                </button>
                            )}
                        </div>

                        {paymentMethod === 'WALLET' && (() => {
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
                            return walletBalance < ((unitPrice * passengers.length) - (appliedCoupon?.discount || 0));
                        })() && (
                            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 text-[10px] text-rose-500 font-black uppercase tracking-widest leading-relaxed italic">
                                <AlertTriangle size={16} className="shrink-0" />
                                <p>Insufficient wallet balance for this booking.</p>
                            </div>
                        )}
                    </div>

                    {/* Payment Error */}
                    {paymentError && (
                        <div className="flex items-start gap-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-rose-500 text-sm">warning</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-rose-500 font-black text-sm uppercase tracking-widest">Payment Failed</p>
                                <p className="text-rose-600 dark:text-rose-400/70 text-xs mt-0.5 leading-relaxed">{paymentError}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={handleFinalConfirm}
                            disabled={isProcessing}
                            className="bg-brand-blue text-white font-black tracking-widest uppercase text-sm py-4 rounded-xl shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing ? <><span className="material-symbols-outlined animate-spin text-sm">refresh</span> Processing...</> : 'Confirm & Pay'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setBookingState('editing'); setPaymentError(null); }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase text-xs py-4 rounded-xl active:bg-slate-50 transition-all"
                        >
                            Back to Selection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (bookingState === 'success') {
        return (
            <div className="card text-center py-12 mb-8 border border-slate-700/50 bg-slate-900/40 animate-in fade-in zoom-in-95 duration-500 rounded-[2.5rem]">
                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-2xl holographic-glow">
                    <img src={brandLogo} alt="Logo" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-widest italic">Ticket Reserved</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                    Your journey on {trainNo} ({trainClass}) has been processed. Confirmation sent to {mobile}.
                </p>
                <button
                    onClick={() => { clearPersistence(); handleReset(); }}
                    className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black tracking-widest uppercase text-sm py-4 rounded-xl transition-all active:scale-95 hover:bg-emerald-500/20"
                >
                    Book Another Ticket
                </button>
            </div>
        );
    }

    return (
        <>
        <form className="bg-transparent relative group mb-32 animate-in fade-in duration-300 text-on-surface">
            {/* Header Area */}
            <div className="flex flex-col gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2.5xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg border border-slate-200 dark:border-white/10 holographic-glow">
                        <img src={brandLogo} alt="Logo" className="w-12 h-12 object-contain" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-1 w-4 rounded-full bg-brand-blue" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-blue">Native Node</span>
                        </div>
                        <h3 className="font-display-lg text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Booking <span className="text-brand-blue">Grid</span></h3>
                    </div>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-brand-blue/50 via-transparent to-transparent"></div>
            </div>

            {/* Search Grid */}
            <div className="glass-panel bg-white dark:bg-slate-950/40 rounded-2xl p-5 relative mb-6 border border-slate-200 dark:border-white/10">
                <div className="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col gap-4">
                    
                    {/* From Input */}
                    <div className="relative" ref={sourceRef}>
                        <label className="text-[9px] uppercase tracking-widest text-brand-blue font-black mb-1 block">From Station</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-3 rounded-xl focus-within:border-brand-blue transition-colors">
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">location_on</span>
                            <input 
                                className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-black text-lg w-full placeholder:text-slate-300 dark:placeholder:text-slate-700 uppercase" 
                                placeholder="ENTER DEPARTURE" 
                                type="text" 
                                value={sourceSearch}
                                onChange={(e) => { setSourceSearch(e.target.value); setSource(''); setShowSourceDropdown(true); }}
                                onFocus={() => setShowSourceDropdown(true)}
                                required={false}
                            />
                        </div>
                        {showSourceDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-60 overflow-y-auto">
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

                    <div className="flex justify-center -my-3 relative z-20">
                        <button type="button" onClick={handleExchangeStations} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-10 h-10 rounded-full flex items-center justify-center text-brand-blue shadow-lg active:scale-90 transition-transform">
                            <span className="material-symbols-outlined text-sm">sync_alt</span>
                        </button>
                    </div>

                    {/* To Input */}
                    <div className="relative" ref={destRef}>
                        <label className="text-[9px] uppercase tracking-widest text-brand-blue font-black mb-1 block">To Station</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-3 rounded-xl focus-within:border-brand-blue transition-colors">
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">near_me</span>
                            <input 
                                className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-black text-lg w-full placeholder:text-slate-300 dark:placeholder:text-slate-700 uppercase" 
                                placeholder="ENTER DESTINATION" 
                                type="text" 
                                value={destinationSearch}
                                onChange={(e) => { setDestinationSearch(e.target.value); setDestination(''); setShowDestDropdown(true); }}
                                onFocus={() => setShowDestDropdown(true)}
                                required={false}
                            />
                        </div>
                        {showDestDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-60 overflow-y-auto">
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
                    {/* Date Input */}
                    <div>
                        <label className="text-[9px] uppercase tracking-widest text-brand-blue font-black mb-1 block">Journey Date</label>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 p-3 rounded-xl focus-within:border-brand-blue relative">
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">calendar_today</span>
                            <input 
                                type="text"
                                inputMode="numeric"
                                placeholder="YYYY-MM-DD"
                                value={journeyDate}
                                onChange={(e) => {
                                    // Basic character filter for YYYY-MM-DD format - removed unstable auto-hyphenation
                                    let val = e.target.value.replace(/[^0-9-]/g, '').slice(0, 10);
                                    setJourneyDate(val);
                                }}
                                className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-black text-lg w-full p-0 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                required={false}
                            />
                            {/* Hidden native picker for mobile convenience - constrained to the icon area to prevent blocking text input */}
                            <div className="flex items-center relative w-6 h-6">
                                <input 
                                    type="date"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full"
                                    onChange={(e) => {
                                        console.log(`[NativeDatePicker] Value selected: ${e.target.value}`);
                                        setJourneyDate(e.target.value);
                                    }}
                                    min={(() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 3);
                                        return d.toISOString().split('T')[0];
                                    })()}
                                    max={(() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 15);
                                        return d.toISOString().split('T')[0];
                                    })()}
                                />
                                <span className="material-symbols-outlined text-brand-blue opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none relative z-10">event</span>
                            </div>
                        </div>
                        <p className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-widest px-1">Note: Strict 3-day gap enforced</p>
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

            {/* Train Results */}
            {availableTrains && availableTrains.length > 0 && (
                <div className="mb-8 space-y-4">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="font-label-sm text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Available Trains ({availableTrains.length})</span>
                    </div>

                    {availableTrains.map((train, idx) => {
                        const t = train.train_base;
                        const isSelected = trainNo === t.train_no;
                        const price = getTicketPrice(source, destination, trainClass, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                        
                        return (
                            <div 
                                key={idx}
                                onClick={() => { setTrainNo(t.train_no); setSelectedTrainName(t.train_name); }}
                                className={`glass-panel rounded-2xl p-5 relative group transition-all cursor-pointer border ${isSelected ? 'bg-brand-blue/5 border-brand-blue/50 dark:border-brand-blue/30' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-brand-blue/30'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-brand-blue shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></span>
                                            <span className={`font-black text-[10px] uppercase tracking-widest ${isSelected ? 'text-brand-blue' : 'text-emerald-500'}`}>
                                                {isSelected ? 'Selected' : 'Available'}
                                            </span>
                                        </div>
                                        <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{t.train_name}</h4>
                                        <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400 tracking-widest uppercase font-bold">Train: {t.train_no}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 py-3 border-y border-slate-100 dark:border-white/5 mb-4 text-center">
                                    {/* Departure */}
                                    <div className="flex-1 text-left">
                                        <span className="font-black text-slate-900 dark:text-white text-base block font-mono">{t.from_time}</span>
                                        {t.departure_date_friendly && (
                                            <span className="font-bold text-[8px] text-brand-blue bg-brand-blue/10 px-1.5 py-0.5 rounded border border-brand-blue/25 inline-block mt-0.5">
                                                {t.departure_date_friendly}
                                            </span>
                                        )}
                                        <span className="font-black text-[9px] text-slate-500 block uppercase tracking-widest truncate max-w-[100px] mt-1" title={t.from_stn_name || source}>
                                            {t.from_stn_name || source}
                                        </span>
                                    </div>

                                    {/* Connection Arrow & Duration */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[70px]">
                                        <span className="font-black text-[8px] font-mono text-slate-500 uppercase tracking-widest">{t.travel_time}</span>
                                        <div className="flex items-center w-full gap-1">
                                            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-sm">arrow_forward</span>
                                            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); fetchSchedule(t); }}
                                            className="text-[8px] text-brand-blue font-black uppercase mt-1 flex items-center gap-0.5 hover:underline"
                                        >
                                            <span className="material-symbols-outlined text-[9px]">schedule</span>
                                            Schedule
                                        </button>
                                    </div>

                                    {/* Arrival */}
                                    <div className="flex-1 text-right">
                                        <span className="font-black text-slate-900 dark:text-white text-base block font-mono">{t.to_time}</span>
                                        {t.arrival_date_friendly && (
                                            <span className="font-bold text-[8px] text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25 inline-block mt-0.5">
                                                {t.arrival_date_friendly}
                                            </span>
                                        )}
                                        <span className="font-black text-[9px] text-slate-500 block uppercase tracking-widest truncate max-w-[100px] mt-1" title={t.to_stn_name || destination}>
                                            {t.to_stn_name || destination}
                                        </span>
                                    </div>
                                </div>
                                <div className={`grid ${(() => {
                                    const classesToShow = getClassesToShow(t.available_classes, t.train_name, t.train_no, t.train_type).filter(clsCode => {
                                        if (clsCode === '1A') {
                                            const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                            return p > 0;
                                        }
                                        return true;
                                    });
                                    return classesToShow.length === 1 ? 'grid-cols-1' : classesToShow.length === 2 ? 'grid-cols-2' : classesToShow.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
                                })()} gap-2 mt-3 mb-1`}>
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
                                            const p = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                            
                                            return (
                                                <button 
                                                    key={clsCode}
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setTrainClass(clsCode); 
                                                        setTrainNo(t.train_no); 
                                                        setSelectedTrainName(t.train_name);
                                                        const pPrice = getTicketPrice(source, destination, clsCode, t.train_name, t.travel_time, t.prices, customPrices, dynamicCorridors);
                                                        if (pPrice > 0) setSelectedUnitPrice(pPrice);
                                                    }}
                                                    className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col justify-between h-full min-h-[60px] ${
                                                        isClsSelected 
                                                            ? 'bg-brand-blue/15 border-brand-blue/40 ring-1 ring-brand-blue/30 text-brand-blue shadow-sm' 
                                                            : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center w-full">
                                                        <span className={`block text-[11px] font-black uppercase leading-tight ${isClsSelected ? 'text-brand-blue' : 'text-slate-900 dark:text-white'}`}>{clsCode}</span>
                                                        <span className="block text-[7px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight truncate w-full mt-0.5 px-0.5">
                                                            {TRAIN_CLASS_LABELS[clsCode] ? TRAIN_CLASS_LABELS[clsCode].replace(/\s*\([^)]*\)/g, '') : clsCode}
                                                        </span>
                                                    </div>
                                                    {p > 0 ? (
                                                        <div className={`flex items-center justify-center gap-0.5 font-black mt-1.5 ${isClsSelected ? 'text-brand-blue' : 'text-slate-900 dark:text-white'}`}>
                                                            <span className="text-[9px] font-mono">₹</span>
                                                            <span className="text-xs font-mono">{p}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[8px] font-black text-amber-500 mt-1.5 uppercase tracking-tighter">Request</span>
                                                    )}
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Passenger Form */}
            <div className={`transition-all duration-500 ${!trainNo ? 'opacity-40 pointer-events-none select-none' : ''}`} ref={passengerSectionRef}>
                {!trainNo && (
                    <div className="mb-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl px-4 py-3">
                        <span className="material-symbols-outlined text-amber-500 text-sm">lock</span>
                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Select a train above to fill passenger details</p>
                    </div>
                )}
                <div className="glass-panel bg-white dark:bg-slate-950/40 rounded-2xl p-5 relative overflow-hidden mb-6 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-black text-brand-blue uppercase tracking-widest text-sm flex items-center gap-2 italic">
                                <span className="material-symbols-outlined text-sm">group</span> Passengers
                            </h3>
                            <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">{passengers.length}/4 max allowed</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddPassenger}
                            disabled={passengers.length >= 4}
                            className={`text-[10px] font-black tracking-widest uppercase border px-3 py-1 rounded-full active:scale-95 transition-all ${
                                passengers.length >= 4
                                    ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                                    : 'text-brand-blue border-brand-blue/20'
                            }`}
                        >
                            {passengers.length >= 4 ? 'MAX' : '+ Add'}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {passengers.map((passenger, index) => (
                            <div key={index} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 relative">
                                {passengers.length > 1 && (
                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePassenger(index); }} className="absolute right-3 top-3 text-rose-500/50 hover:text-rose-500">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black mb-1 block">Passenger Name</label>
                                        <input type="text" value={passenger.name} onChange={(e) => handlePassengerChange(index, 'name', e.target.value)} required placeholder="ENTER NAME" className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-brand-blue outline-none font-black" />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black mb-1 block">Age</label>
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
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-brand-blue outline-none font-black" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black mb-1 block">Gender</label>
                                            <select value={passenger.gender} onChange={(e) => handlePassengerChange(index, 'gender', e.target.value as any)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:border-brand-blue outline-none appearance-none font-black">
                                                <option value="M">MALE</option>
                                                <option value="F">FEMALE</option>
                                                <option value="O">OTHER</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comms Channels */}
                <div className="glass-panel bg-white dark:bg-slate-950/40 rounded-2xl p-5 relative overflow-hidden mb-6 border border-slate-200 dark:border-white/10">
                    <h3 className="font-black text-brand-blue uppercase tracking-widest text-sm flex items-center gap-2 mb-4 italic">
                        <span className="material-symbols-outlined text-sm">cell_tower</span> Contact details
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black mb-1 block">Mobile Number</label>
                            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} required placeholder="ENTER 10-DIGIT MOBILE" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-brand-blue outline-none font-black" />
                        </div>
                        <div>
                            <label className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-black mb-1 block">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ENTER EMAIL" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:border-brand-blue outline-none font-black" />
                        </div>
                    </div>
                </div>

                {/* Final Action */}
                <div className="mt-8">
                    {(() => {
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
                            className="w-full bg-brand-blue text-white font-black py-4 rounded-xl shadow-xl active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">rocket_launch</span> Book Ticket
                        </button>
                    ) : (
                        <button type="button" onClick={handleRequestPrice} disabled={isProcessing || !trainNo || !trainClass} className="w-full bg-brand-blue/10 border border-brand-blue text-brand-blue font-black py-4 rounded-xl active:scale-95 transition-transform uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                            {isProcessing ? <span className="material-symbols-outlined animate-spin text-sm">refresh</span> : <span className="material-symbols-outlined text-sm">request_quote</span>}
                            Request Price
                        </button>
                    )}
                </div>
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
                                    <span className="material-symbols-outlined text-brand-blue">schedule</span>
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
                                    <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Time Table...</span>
                                </div>
                            ) : scheduleData.length > 0 ? (
                                <div className="space-y-4">
                                    {scheduleData.map((stop: any, idx: number) => (
                                        <div key={idx} className="flex items-start gap-4 group">
                                            <div className="flex flex-col items-center mt-2">
                                                <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ring-2 ${stop.isHalt ? 'bg-brand-blue ring-brand-blue/20 shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'bg-slate-300 ring-slate-100 dark:ring-slate-800'}`}></div>
                                                {idx !== scheduleData.length - 1 && <div className="w-0.5 h-16 bg-slate-200 dark:bg-white/5 group-hover:bg-brand-blue/30 transition-colors mt-1"></div>}
                                            </div>
                                            <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-sm group-hover:border-brand-blue/20 group-hover:shadow-md transition-all">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                        {stop.stationName} 
                                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-brand-blue border border-slate-200 dark:border-white/10">{stop.stationCode}</span>
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg">Day {stop.day} • {stop.distance} KM</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                                                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{stop.arrivalTime === '--:--' ? 'Starts' : stop.arrivalTime}</p>
                                                    </div>
                                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</p>
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
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Schedule data synchronized but empty</span>
                                    <button onClick={() => setShowSchedule(false)} className="text-brand-blue font-black text-xs uppercase tracking-widest hover:underline">Close Terminal</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
