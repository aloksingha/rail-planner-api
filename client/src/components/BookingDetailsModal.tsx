import { useState } from 'react';
import axios from 'axios';
import { X, User, Calendar, MapPin, CreditCard, Clock, Clipboard, CheckCircle2, AlertCircle } from 'lucide-react';

interface BookingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onRefresh?: () => void;
}

export default function BookingDetailsModal({ isOpen, onClose, booking, onRefresh }: BookingDetailsModalProps) {
    const [actionProcessing, setActionProcessing] = useState(false);

    const isCancellationAllowed = (dateString: string) => {
        if (!dateString) return false;
        const journeyDate = new Date(dateString);
        const now = new Date();
        const deadline = new Date(journeyDate);
        deadline.setDate(deadline.getDate() - 1);
        deadline.setHours(20, 0, 0, 0);
        return now <= deadline;
    };

    const isCancelAllowed = booking && 
        (booking.status === 'CONFIRMED' || booking.status === 'SUCCESS') &&
        isCancellationAllowed(booking.event?.date);

    const handleCancelPassenger = async (name: string) => {
        if (!window.confirm(`Are you sure you want to cancel the ticket for passenger ${name}? A proportional refund will be issued.`)) {
            return;
        }

        setActionProcessing(true);
        try {
            await axios.post(`/api/customer/bookings/${booking.id}/cancel-passenger`, { passengerName: name });
            alert(`Passenger ${name} ticket cancelled successfully!`);
            onClose();
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to cancel passenger ticket.');
        } finally {
            setActionProcessing(false);
        }
    };

    const handleFullCancellation = async () => {
        if (!window.confirm("Are you sure you want to cancel this entire booking? A full refund will be issued.")) {
            return;
        }

        setActionProcessing(true);
        try {
            await axios.put(`/api/customer/bookings/${booking.id}/cancel`);
            alert("Booking cancelled successfully!");
            onClose();
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to cancel booking.");
        } finally {
            setActionProcessing(false);
        }
    };

    if (!isOpen || !booking) return null;

    const parseDescription = (desc: string) => {
        const details: any = {
            passengers: [],
            meta: {}
        };

        if (!desc) return details;

        try {
            // Pattern 1: New Standardized Format
            // "Passengers: Name (Age), Gender; Name (Age), Gender"
            if (desc.includes('Passengers:')) {
                const passengerMarker = /Passengers:\s*([^.]+)/i;
                const pMatch = desc.match(passengerMarker);
                if (pMatch && pMatch[1]) {
                    const rawPText = pMatch[1].trim();
                    if (rawPText.includes('Count:')) {
                        const count = rawPText.match(/Count:\s*(\d+)/i);
                        details.passengers = [{ name: 'Group Booking', age: count ? count[1] : '?', gender: 'N/A', isSummary: true }];
                    } else if (rawPText.includes(';')) {
                        const pList = rawPText.split(';').map((p: string) => p.trim()).filter((p: string) => p.length > 2);
                        details.passengers = pList.map((p: string) => {
                            let rawNamePart = p.split('(')[0].trim();
                            let isCancelled = false;
                            if (rawNamePart.includes('[CANCELLED]')) {
                                isCancelled = true;
                                rawNamePart = rawNamePart.replace('[CANCELLED]', '').trim();
                            }
                            const ageMatch = p.match(/\((\d+)\)/);
                            const age = ageMatch ? ageMatch[1] : 'N/A';
                            const genderPart = p.split(',')[1]?.trim();
                            let gender = 'N/A';
                            if (genderPart) {
                                const g = genderPart.toUpperCase().trim();
                                if (g === 'MALE' || g === 'M') gender = 'MALE';
                                else if (g === 'FEMALE' || g === 'F') gender = 'FEMALE';
                                else if (g === 'OTHER' || g === 'O') gender = 'OTHER';
                            }
                            if (rawNamePart) return { name: rawNamePart, age, gender, isCancelled };
                            return null;
                        }).filter(Boolean);
                    } else {
                        // Single passenger in New Format
                        let rawNamePart = rawPText.split('(')[0].trim();
                        let isCancelled = false;
                        if (rawNamePart.includes('[CANCELLED]')) {
                            isCancelled = true;
                            rawNamePart = rawNamePart.replace('[CANCELLED]', '').trim();
                        }
                        const ageMatch = rawPText.match(/\((\d+)\)/);
                        const age = ageMatch ? ageMatch[1] : 'N/A';
                        if (rawNamePart) details.passengers = [{ name: rawNamePart, age, gender: 'N/A', isCancelled }];
                    }
                }
            }
            
            // Pattern 2: Generic fallback for any format
            if (details.passengers.length === 0) {
                // Look for common MALE/FEMALE/M/F indicators
                const pList = desc.split(/[;.]/).map(s => s.trim()).filter(s => s.length > 2);
                details.passengers = pList.map(p => {
                    const ageMatch = p.match(/\((\d+)\)/) || p.match(/\b(\d{1,2})\b/);
                    const age = ageMatch ? ageMatch[1] : 'N/A';
                    
                    let gender = 'N/A';
                    if (/\b(MALE|M)\b/i.test(p)) gender = 'MALE';
                    else if (/\b(FEMALE|F)\b/i.test(p)) gender = 'FEMALE';
                    
                    // Extract name (everything before the first parenthesis or digit)
                    let name = p.split(/[(\d]/)[0].trim();
                    if (name.includes('Passengers:')) name = name.replace('Passengers:', '').trim();
                    
                    let isCancelled = false;
                    if (name.includes('[CANCELLED]')) {
                        isCancelled = true;
                        name = name.replace('[CANCELLED]', '').trim();
                    }
                    
                    if (name && name.length > 1) return { name, age, gender, isCancelled };
                    return null;
                }).filter(Boolean);
            }

            // Extract Meta info
            const splitParts = desc.split('.');
            splitParts.forEach(part => {
               if (part.includes('Mobile:')) details.meta.mobile = part.replace('Mobile:', '').trim();
               if (part.includes('Train:')) details.meta.train = part.replace('Train:', '').trim();
            });

        } catch (e) {
            console.error('Parser Error:', e);
        }

        return details;
    };

    const details = parseDescription(booking.event?.description || '');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white data-[theme=dark]:bg-slate-900 border border-slate-200 data-[theme=dark]:border-white/10 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-hidden flex flex-col">
                
                <div className="relative p-6 border-b border-slate-100 data-[theme=dark]:border-white/5 bg-slate-50 data-[theme=dark]:bg-slate-950/30">
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                                <Clipboard size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 data-[theme=dark]:text-white uppercase italic leading-none mb-1.5">
                                    Ticket Details
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="px-1.5 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20 text-[8px] font-black text-brand-blue uppercase tracking-widest">
                                        BOOKING ID: {booking.id.substring(0, 10).toUpperCase()}
                                    </div>
                                    <div className="px-1.5 py-0.5 rounded bg-slate-100 data-[theme=dark]:bg-white/5 border border-slate-200 data-[theme=dark]:border-white/10 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                        {booking.class || 'GEN'} CLASS
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 data-[theme=dark]:bg-white/5 hover:bg-slate-200 data-[theme=dark]:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 data-[theme=dark]:hover:text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <div className="bg-slate-50 data-[theme=dark]:bg-white/5 rounded-2xl border border-slate-100 data-[theme=dark]:border-white/5 p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <MapPin size={40} className="text-brand-blue" />
                        </div>
                        <div className="flex flex-col gap-1 relative z-10">
                            <span className="text-[8px] font-black text-brand-blue uppercase tracking-[0.2em] mb-1">Train & Route</span>
                            <h4 className="text-lg font-black text-slate-900 data-[theme=dark]:text-white leading-tight italic uppercase tracking-tight">{booking.event?.name}</h4>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                    <Calendar size={12} className="text-brand-blue" />
                                    {booking.event?.date ? new Date(booking.event.date).toLocaleDateString('en-IN', {
                                        day: 'numeric', month: 'short', year: 'numeric'
                                    }) : 'N/A'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                    <Clock size={12} className="text-teal-500" />
                                    {new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <User className="text-brand-blue" size={14} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Passenger Manifest</span>
                            </div>
                            <span className="text-[9px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md border border-brand-blue/20">
                                {details.passengers.length} TICKETS
                            </span>
                        </div>

                        {details.passengers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {details.passengers.map((p: any, idx: number) => (
                                    <div key={idx} className={`group relative bg-slate-50 data-[theme=dark]:bg-slate-950/40 rounded-xl border border-slate-100 data-[theme=dark]:border-white/5 p-4 transition-all flex items-center justify-between ${p.isCancelled ? 'opacity-50' : 'hover:border-brand-blue/40'}`}>
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="w-10 h-10 rounded-lg bg-white data-[theme=dark]:bg-slate-900 border border-slate-200 data-[theme=dark]:border-white/10 flex items-center justify-center text-brand-blue font-black text-xs">
                                                {p.isSummary ? 'Σ' : idx + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className={`text-sm font-black text-slate-900 data-[theme=dark]:text-white uppercase italic tracking-wide ${p.isCancelled ? 'line-through' : 'group-hover:text-brand-blue'}`}>
                                                    {p.name}
                                                </p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[9px] font-bold text-slate-500">AGE: <span className="text-slate-900 data-[theme=dark]:text-white">{p.age}</span></span>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                                        p.gender?.includes('MALE') ? 'text-brand-blue bg-brand-blue/10' : 
                                                        p.gender?.includes('FEMALE') ? 'text-rose-400 bg-rose-400/10' : 
                                                        'text-slate-400 bg-slate-400/10'
                                                    }`}>
                                                        {p.gender}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {p.isCancelled ? (
                                            <span className="text-[8px] font-black text-rose-500 bg-rose-500/15 border border-rose-500/30 px-2 py-1 rounded-lg uppercase tracking-wider">
                                                Cancelled
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {isCancelAllowed && (
                                                    <button
                                                        onClick={() => handleCancelPassenger(p.name)}
                                                        disabled={actionProcessing}
                                                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg border border-rose-500/20 text-[9px] font-black transition-all uppercase tracking-wider"
                                                    >
                                                        {actionProcessing ? '...' : 'Cancel'}
                                                    </button>
                                                )}
                                                <div className="flex items-center justify-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shrink-0">
                                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/10 p-6 flex flex-col items-center text-center">
                                <AlertCircle className="text-amber-500/40 mb-3" size={24} />
                                <h5 className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-1.5">No Passenger Tokens Parsed</h5>
                                <p className="text-amber-500/50 text-[10px] font-bold max-w-sm">
                                    {booking.event?.description || 'Data is missing or stored in an incompatible format.'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <CreditCard className="text-brand-blue" size={14} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Financial Breakdown</span>
                            </div>
                        </div>
                        
                        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/10 p-5">
                            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Paid Successful</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-bold">Total Fare ({details.passengers.length} Pax)</span>
                                    <span className="text-slate-900 data-[theme=dark]:text-white font-black">₹{booking.amount?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Paid</span>
                                    <span className="text-lg font-black text-brand-blue italic tracking-tight">₹{booking.amount?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 data-[theme=dark]:border-white/5 bg-slate-50 data-[theme=dark]:bg-slate-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard size={12} className="text-slate-500" />
                        <span className="text-[9px] text-slate-500 font-mono italic truncate max-w-[120px]">{booking.paymentId || 'INTERNAL'}</span>
                    </div>
                    <div className="flex gap-2">
                        {isCancelAllowed && (
                            <button
                                onClick={handleFullCancellation}
                                disabled={actionProcessing}
                                className="px-4 py-2 bg-rose-500 text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-rose-500/20 hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                            >
                                {actionProcessing ? 'Processing...' : 'Cancel Booking'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-brand-blue text-white text-[10px] font-black rounded-lg transition-all shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                        >
                            DONE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
