import { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, Download, Users } from 'lucide-react';

interface Event {
    name: string;
    date: string;
}

interface User {
    email: string;
}

interface Booking {
    id: string;
    status: string;
    createdAt: string;
    ticketUrl?: string;
    event: Event;
    user: User;
}

export default function TeamBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Fetch team bookings for Sales Manager
                const response = await axios.get('/api/admin/bookings?scope=team');
                setBookings(response.data.bookings || []);
            } catch (error) {
                console.error('Failed to fetch team bookings', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) {
        return <div className=" text-brand-orange font-bold py-10">Loading team bookings...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="mb-8 p-8 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-rose shadow-xl shadow-brand-orange/20 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-white">Team Bookings</h1>
                    <p className="text-white/70 mt-1">View bookings and reservations from your collaborative sales team.</p>
                </div>
            </header>

            <div className="card relative overflow-hidden group border border-slate-700/50 bg-surface/50">
                <div className="absolute right-0 top-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-brand-orange" size={20} />
                        Team Sales
                    </h2>
                    <span className="text-xs bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full border border-brand-orange/20 font-black uppercase tracking-widest">
                        {bookings.length} reservations
                    </span>
                </div>

                <div className="space-y-4 relative z-10">
                    {bookings.length === 0 ? (
                        <p className="text-slate-500 italic py-4">No team bookings found.</p>
                    ) : (
                        bookings.map((booking) => (
                            <div key={booking.id} className="p-5 bg-slate-900/40 rounded-2xl border border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-orange/30 transition-all hover:bg-slate-900/60 group/item">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-white font-black text-lg">{booking.event.name}</p>
                                        <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md uppercase font-black border border-slate-700">By: {booking.user?.email?.split('@')[0] || 'Unknown'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-brand-orange" />
                                            {new Date(booking.event.date).toLocaleDateString()}
                                        </div>
                                        <div className="font-mono uppercase tracking-tighter opacity-70">ID: {booking.id}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <span className={`text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest border ${booking.status === 'CONFIRMED' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/20' :
                                        booking.status === 'CANCELLED' ? 'bg-brand-rose/10 text-brand-rose border-brand-rose/20' :
                                            'bg-brand-orange/10 text-brand-orange border-brand-orange/20'
                                        }`}>
                                        {booking.status}
                                    </span>

                                    {booking.status === 'CONFIRMED' && booking.ticketUrl && (
                                        <a
                                            href={`${API_BASE_URL}${booking.ticketUrl}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/80 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5 active:scale-95"
                                        >
                                            <Download size={14} />
                                            Ticket
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
