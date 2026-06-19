import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Ticket, Trash2, Upload, CheckCircle, ChevronDown, MessageCircle, Phone, Eye, Loader2, X } from 'lucide-react';
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
            <div className="w-12 h-12 rounded-full border-4 border-brand-blue/20 border-t-brand-blue animate-spin" />
            <span className="text-slate-400 font-medium uppercase text-[10px] tracking-widest">Loading bookings...</span>
        </div>
    );

    return (
        <div className="pb-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* SCI-FI HEADER */}
            <div className="glass-panel p-6 mb-6 relative overflow-hidden group bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-repeat bg-[length:24px_24px]" />
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                            <Ticket className="text-brand-blue" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Bookings</h1>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">Global booking oversight</p>
                        </div>
                    </div>

                    <div className="bg-brand-blue/5 dark:bg-brand-blue/10 rounded-xl px-4 py-2 border border-slate-200 dark:border-brand-blue/30">
                        <p className="text-brand-blue text-lg font-black leading-none tracking-tighter">{bookings.length}</p>
                        <p className="text-slate-500 text-[7px] uppercase font-black tracking-widest mt-1">BOOKINGS</p>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-brand-blue/50 via-teal-500/50 to-transparent" />
            </div>

            {/* SEARCH & FILTERS */}
            <div className="glass-panel p-4 mb-6 space-y-4 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-white/10">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full glass-panel pl-11 pr-4 py-3 text-xs font-black text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50"
                    />
                </div>
                <div className="flex gap-2">
                    <select 
                      value={statusFilter} 
                      onChange={e => setStatusFilter(e.target.value)}
                      className="flex-1 glass-panel px-3 py-3 text-[9px] font-black uppercase tracking-widest outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="SUCCESS">Confirmed</option>
                      <option value="PENDING">Processing</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select 
                      value={sortBy} 
                      onChange={e => setSortBy(e.target.value)}
                      className="flex-1 glass-panel px-3 py-3 text-[9px] font-black uppercase tracking-widest outline-none border border-slate-200 dark:border-white/10 focus:border-brand-blue/50 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white"
                    >
                      <option value="createdAt-desc">Newest</option>
                      <option value="createdAt-asc">Oldest</option>
                    </select>
                </div>
                <div className="pt-2">
                    <ReportExport data={filteredBookings} filename="Booking_Report" title="Bookings Report" dateKey="createdAt" />
                </div>
            </div>

            {/* BOOKING LIST */}
            <div className="space-y-4">
                {filteredBookings.map((b) => {
                    const rs = getRowState(b.id);
                    const selected = rs.selectedStatus || getTicketStatus(b);
                    
                    return (
                        <div key={b.id} className="glass-panel p-5 relative overflow-hidden group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                            <div className={`absolute top-0 left-0 w-1 h-full ${selected === 'SUCCESS' ? 'bg-emerald-500' : selected === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'} opacity-50`} />
                            
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                       <div className={`w-1.5 h-1.5 rounded-full ${selected === 'SUCCESS' ? 'bg-emerald-500 animate-pulse' : 'bg-brand-blue'}`} />
                                       <span className="text-[11px] font-black text-slate-900 dark:text-white font-mono tracking-tighter">ID: TP-{b.id.slice(-8).toUpperCase()}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">{b.paymentId || 'INTERNAL_SYS'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setSelectedBookingForDetails(b)} className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-brand-blue transition-all bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                                        <Eye size={16} />
                                    </button>
                                    {b.ticketUrl && (
                                        <a href={`${API_BASE_URL}${b.ticketUrl}`} target="_blank" className="w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-brand-blue bg-brand-blue/5 border-brand-blue/20">
                                            <Ticket size={16} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 mb-5">
                                <div className="flex flex-col gap-1 border-l-2 border-white/5 pl-3">
                                    <span className="text-[12px] font-black italic uppercase tracking-tight text-slate-900 dark:text-white leading-none">{b.event?.name}</span>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                        {new Date(b.event?.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 border-l-2 border-white/5 pl-3">
                                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">{b.user?.email}</span>
                                    {b.user?.mobile && (
                                        <div className="flex items-center gap-3 mt-1">
                                            <a href={`tel:${b.user.mobile}`} className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                                                <Phone size={10} /> {b.user.mobile}
                                            </a>
                                            <a href={`https://wa.me/${b.user.mobile}`} target="_blank" className="text-emerald-500">
                                                <MessageCircle size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenStatusDropdownId(b.id); }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all
                                            ${selected === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                              selected === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                                              'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {selected === 'SUCCESS' ? <CheckCircle size={14} /> : selected === 'PENDING' ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                                            {selected === 'SUCCESS' ? 'Confirmed' : selected === 'PENDING' ? 'Processing' : 'Cancelled'}
                                        </div>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${openStatusDropdownId === b.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openStatusDropdownId === b.id && (
                                        <div className="absolute z-[50] bottom-full left-0 mb-2 w-full glass-panel overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                                            {['PENDING', 'SUCCESS', 'CANCELLED'].map(s => (
                                                <button 
                                                    key={s} 
                                                    onClick={() => handleStatusChange(b.id, s)} 
                                                    className={`w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-colors border-b border-slate-100 dark:border-white/5 last:border-0
                                                        ${s === selected ? 'text-brand-blue bg-brand-blue/5' : 'text-slate-500 dark:text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5'}`}
                                                >
                                                    {s === 'SUCCESS' ? 'Confirmed' : s === 'PENDING' ? 'Processing' : 'Cancelled'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selected === 'SUCCESS' && !b.ticketUrl && (
                                    <label className="w-full flex items-center justify-center gap-3 py-3.5 bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/20 dark:border-brand-blue/30 rounded-xl text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] cursor-pointer hover:bg-brand-blue/10 transition-all active:scale-95 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                                        <Upload size={14} /> UPLOAD TICKET
                                        <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(b.id, e.target.files[0])} />
                                    </label>
                                )}

                                {b.ticketUrl && (
                                    <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                        <div className="flex items-center gap-2 text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                                            <CheckCircle size={12} /> TICKET ATTACHED
                                        </div>
                                        <button onClick={() => handleDeleteTicket(b.id)} className="p-1 text-rose-500/40 hover:text-rose-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}

                                {isSuperAdmin && (
                                    <button 
                                        onClick={() => setConfirmModal({ isOpen: true, action: 'DELETE', bookingId: b.id })} 
                                        className="w-full py-3 border border-rose-500/20 text-rose-500/40 hover:text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        REMOVE BOOKING
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`fixed bottom-6 left-4 right-4 z-[200] p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-bottom-6 backdrop-blur-md shadow-2xl
                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-rose-950/90 border-rose-500/50 text-rose-400'}`}>
                    <CheckCircle size={18} />
                    <span className="font-black uppercase tracking-widest text-[10px] italic">{toast.msg}</span>
                </div>
            )}

            <BookingDetailsModal isOpen={!!selectedBookingForDetails} onClose={() => setSelectedBookingForDetails(null)} booking={selectedBookingForDetails} onRefresh={fetchBookings} />
            
            {/* DELETE CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass-panel p-8 max-w-sm w-full shadow-[0_0_50px_rgba(244,63,94,0.2)] border-rose-500/20">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic">Confirm</h3>
                                <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest">Action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed mb-8">Are you sure you want to delete this record from the database?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={closeModal} className="py-4 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-white/5">CANCEL</button>
                            <button onClick={handleConfirmAction} className="py-4 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-900/40 active:scale-95 transition-transform">CONFIRM</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
