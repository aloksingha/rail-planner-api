import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, CalendarDays, Ticket, Trash2, Upload, CheckCircle, ChevronDown, MessageCircle, Phone, Eye } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import ReportExport from '../components/ReportExport';
import BookingDetailsModal from '../components/BookingDetailsModal';

import { useBookingManagement, getTicketStatus, GlobalBooking } from '../hooks/useBookingManagement';

export default function BookingManagement() {
    const {
        loading,
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        statusFilter,
        setStatusFilter,
        toast,
        filteredBookings,
        handleStatusChange,
        handleCancelBooking,
        handleDeleteBooking,
        handleFileUpload,
        handleDeleteTicket,
        bookings,
        fetchBookings
    } = useBookingManagement();

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [rowState, setRowState] = useState<Record<string, { selectedStatus: string }>>({});
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
    const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<GlobalBooking | null>(null);

    const getRowState = (id: string) => rowState[id] ?? { selectedStatus: '' };

    const setRow = (id: string, patch: Partial<ReturnType<typeof getRowState>>) =>
        setRowState(prev => ({ ...prev, [id]: { ...getRowState(id), ...patch } }));

    const token = localStorage.getItem('token');
    let isSuperAdmin = false;
    if (token) {
        try {
            const decoded = jwtDecode<{ role: string }>(token);
            isSuperAdmin = decoded.role === 'SUPER_ADMIN';
        } catch (e) {
            console.error('Failed to decode token', e);
        }
    }

    useEffect(() => {
        const handleClickOutside = () => setOpenStatusDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; action: 'CANCEL' | 'DELETE' | 'DELETE_TICKET' | null; bookingId: string | null }>({ isOpen: false, action: null, bookingId: null });
    const closeModal = () => setConfirmModal({ isOpen: false, action: null, bookingId: null });

    const handleConfirmAction = async () => {
        if (!confirmModal.bookingId) return;
        if (confirmModal.action === 'DELETE') {
            await handleDeleteBooking(confirmModal.bookingId);
        } else {
            await handleCancelBooking(confirmModal.bookingId);
        }
        closeModal();
    };


    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-brand-blue border-t-transparent animate-spin" />
            <span className="text-slate-400 font-medium">Synchronizing...</span>
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
            {/* Dark Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-8 shadow-2xl border border-white/5">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center border border-brand-blue/20">
                        <Ticket size={24} className="text-brand-blue" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Booking Management</h1>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Global Precision Control</p>
                    </div>
                    <div className="md:ml-auto">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl px-6 py-2 border border-white/10 text-center">
                            <p className="text-white text-2xl font-black leading-none tracking-tighter">{bookings.length}</p>
                            <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest mt-1">Total Records</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 space-y-4 bg-slate-950/20">
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search Reference or Email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-300 outline-none focus:border-brand-blue/50 transition-all placeholder:text-slate-700"
                            />
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                           <select 
                             value={statusFilter} 
                             onChange={e => setStatusFilter(e.target.value)}
                             className="bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest h-10 outline-none focus:border-brand-blue/50"
                           >
                             <option value="ALL">ALL STATUS</option>
                             <option value="SUCCESS">SUCCESS</option>
                             <option value="PENDING">PENDING</option>
                             <option value="CANCELLED">CANCELLED</option>
                           </select>
                           <select 
                             value={sortBy} 
                             onChange={e => setSortBy(e.target.value)}
                             className="bg-slate-950/50 border border-slate-800 text-slate-400 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest h-10 outline-none focus:border-brand-blue/50"
                           >
                             <option value="createdAt-desc">NEWEST FIRST</option>
                             <option value="createdAt-asc">OLDEST FIRST</option>
                           </select>
                           <ReportExport data={filteredBookings} filename="Bookings" title="Production Report" dateKey="createdAt" />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-950 text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Booking ID</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Customer</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Event Data</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Moderation</th>
                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-60 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-slate-900/40">
                            {filteredBookings.map((b) => {
                                const rs = getRowState(b.id);
                                const selected = rs.selectedStatus || getTicketStatus(b);
                                
                                return (
                                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                                    <span className="text-[10px] font-black text-white/90 font-mono tracking-tighter">TP-{b.id.slice(-8).toUpperCase()}</span>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-600 font-mono uppercase truncate max-w-[120px]">{b.paymentId || 'INTERNAL_SYS'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-black text-slate-300 tracking-tight italic">{b.user?.email}</span>
                                                {b.user?.mobile && (
                                                    <div className="flex items-center gap-3">
                                                        <a href={`tel:${b.user.mobile}`} className="text-[9px] font-black text-slate-500 hover:text-brand-blue flex items-center gap-1.5 transition-all">
                                                            <Phone size={10} className="shrink-0" /> {b.user.mobile}
                                                        </a>
                                                        <a href={`https://wa.me/${b.user.mobile}`} target="_blank" className="p-1.5 bg-emerald-500/5 text-emerald-500 rounded-lg hover:bg-emerald-500/10 transition-colors">
                                                            <MessageCircle size={10} />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[11px] font-black italic uppercase tracking-tight text-white/80 leading-none">{b.event?.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <CalendarDays size={10} className="text-brand-blue opacity-50" />
                                                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{new Date(b.event?.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                 </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <div className="flex flex-col gap-3">
                                                <div className="relative inline-block w-36">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setOpenStatusDropdownId(b.id); }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
                                                            ${selected === 'SUCCESS' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500 shadow-[0_0_15px_-5px_rgba(16,185,129,0.3)]' :
                                                              selected === 'PENDING' ? 'bg-amber-500/5 border-amber-500/10 text-amber-500 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]' :
                                                              'bg-rose-500/5 border-rose-500/10 text-rose-500 shadow-[0_0_15px_-5px_rgba(244,63,94,0.3)]'}`}
                                                    >
                                                        {selected === 'SUCCESS' ? '✔ SUCCESS' : selected === 'PENDING' ? '⏳ PENDING' : '✖ CANCELLED'}
                                                        <ChevronDown size={12} className={`transition-transform ${openStatusDropdownId === b.id ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {openStatusDropdownId === b.id && (
                                                        <div className="absolute z-[40] top-full left-0 mt-2 w-full bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2">
                                                            {['PENDING', 'SUCCESS', 'CANCELLED'].map(s => (
                                                                <button key={s} onClick={() => handleStatusChange(b.id, s)} className="w-full text-left px-4 py-2.5 text-[9px] font-black text-slate-500 hover:bg-white/5 hover:text-white border-b border-white/5 last:border-0 uppercase tracking-widest transition-colors">
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {selected === 'SUCCESS' && !b.ticketUrl && (
                                                    <label className="flex items-center justify-center gap-2 text-[9px] text-brand-blue font-black rounded-xl border border-brand-blue/20 px-4 py-2 bg-brand-blue/5 cursor-pointer hover:bg-brand-blue/10 transition-all uppercase tracking-widest w-fit">
                                                        <Upload size={12} /> UPLOAD TICKET
                                                        <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(b.id, e.target.files[0])} />
                                                    </label>
                                                )}
                                                {b.ticketUrl && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1.5 text-[9px] text-emerald-500 font-black uppercase tracking-widest">
                                                            <CheckCircle size={11} /> ATTACHED
                                                        </div>
                                                        <button onClick={() => handleDeleteTicket(b.id)} title="Purge PDF" className="p-1.5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 align-top text-right">
                                            <div className="flex justify-end gap-2.5">
                                                <button onClick={() => setSelectedBookingForDetails(b)} className="w-10 h-10 rounded-2xl bg-slate-950 border border-white/5 text-slate-500 hover:text-brand-blue hover:border-brand-blue/40 transition-all flex items-center justify-center shadow-lg">
                                                    <Eye size={18} />
                                                </button>
                                                {b.ticketUrl && (
                                                    <a href={`${API_BASE_URL}${b.ticketUrl}`} target="_blank" className="w-10 h-10 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue hover:text-white transition-all flex items-center justify-center shadow-lg shadow-brand-blue/20">
                                                        <Ticket size={18} />
                                                    </a>
                                                )}
                                                {isSuperAdmin && (
                                                    <button onClick={() => setConfirmModal({ isOpen: true, action: 'DELETE', bookingId: b.id })} className="w-10 h-10 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500/40 hover:text-rose-500 hover:border-rose-500/40 transition-all flex items-center justify-center shadow-lg">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                	);
                            	})}
                        </tbody>
                    </table>
                </div>
            </div>

            {toast && (
                <div className={`fixed bottom-10 right-10 z-[200] px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border flex items-center gap-3 animate-in slide-in-from-bottom-6 transition-all backdrop-blur-md
                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/90 border-rose-500/50 text-rose-400'}`}>
                    <CheckCircle size={20} className="drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="font-black uppercase tracking-widest text-[11px] italic">{toast.msg}</span>
                </div>
            )}

            <BookingDetailsModal isOpen={!!selectedBookingForDetails} onClose={() => setSelectedBookingForDetails(null)} booking={selectedBookingForDetails} onRefresh={fetchBookings} />
            
            {/* Dark Confirm Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] max-w-sm w-full shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-5 mb-8">
                            <div className="w-14 h-14 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                                <Trash2 size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase italic leading-none">Confirm</h3>
                                <p className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest mt-1">Irreversible Action</p>
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed mb-10">Are you sure you want to purge this record? This will permanently delete the booking and all associated metadata.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={closeModal} className="py-4 rounded-2xl bg-white/5 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5">ABORT</button>
                            <button onClick={handleConfirmAction} className="py-4 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 shadow-xl shadow-rose-900/40 transition-all transform active:scale-95">CONFIRM</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
