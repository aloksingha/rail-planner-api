import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export interface GlobalBooking {
    id: string;
    status: string;
    createdAt: string;
    ticketUrl?: string;
    class?: string;
    paymentId?: string | null;
    user: { email: string; mobile: string | null };
    event: { name: string; date: string };
    refundRecords?: Array<{
        status: string;
        razorpayRefundId?: string;
        updatedAt: string;
    }>;
}

export const useBookingManagement = () => {
    const [bookings, setBookings] = useState<GlobalBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt-desc');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let scopeUrl = '/api/admin/bookings';
            
            if (token) {
                const decoded = jwtDecode<{ role: string }>(token);
                if (decoded.role === 'ADMIN' || decoded.role === 'SUPER_ADMIN') {
                    scopeUrl += '?scope=all';
                }
            }

            const { data } = await axios.get(scopeUrl);
            setBookings(data.bookings || []);
        } catch (error) {
            console.error('Failed to fetch bookings', error);
            showToast('Failed to fetch bookings.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await axios.patch(`/api/admin/bookings/${id}/status`, { status: newStatus });
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
            showToast(`Status updated to ${newStatus}`);
        } catch (err) {
            console.error('Failed to update status', err);
            showToast('Failed to update status.', 'error');
        }
    };

    const handleCancelBooking = async (id: string) => {
        try {
            await axios.put(`/api/admin/bookings/${id}/cancel`);
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
            showToast('Booking cancelled — refund has been enqueued.');
        } catch (error) {
            console.error('Failed to cancel booking', error);
            showToast('Failed to cancel booking.', 'error');
        }
    };

    const handleDeleteBooking = async (id: string) => {
        try {
            await axios.delete(`/api/admin/bookings/${id}`);
            setBookings(prev => prev.filter(b => b.id !== id));
            showToast('Booking permanently deleted.');
        } catch (error) {
            console.error('Failed to delete booking', error);
            showToast('Failed to delete booking.', 'error');
        }
    };

    const handleFileUpload = async (id: string, file: File) => {
        if (file.type !== 'application/pdf') {
            showToast('Only PDF files are allowed.', 'error');
            return;
        }
        const formData = new FormData();
        formData.append('ticket', file);
        try {
            const { data } = await axios.post(`/api/admin/bookings/${id}/ticket`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setBookings(prev => prev.map(b => b.id === id ? { ...b, ticketUrl: data.ticketUrl } : b));
            showToast('Ticket PDF uploaded successfully!');
        } catch (error) {
            console.error('Failed to upload ticket', error);
            showToast('Failed to upload PDF.', 'error');
        }
    };

    const handleDeleteTicket = async (id: string) => {
        try {
            await axios.delete(`/api/admin/bookings/${id}/ticket`);
            setBookings(prev => prev.map(b => b.id === id ? { ...b, ticketUrl: undefined } : b));
            showToast('Ticket PDF deleted successfully.');
        } catch (error: any) {
            console.error('Failed to delete ticket', error);
            showToast('Failed to delete PDF.', 'error');
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.event?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        if (sortBy === 'createdAt-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'createdAt-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return 0;
    });

    return {
        bookings,
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
        fetchBookings
    };
};

export const getTicketStatus = (b: GlobalBooking): 'PENDING' | 'SUCCESS' | 'CANCELLED' => {
    if (b.status === 'CANCELLED') return 'CANCELLED';
    if (b.status === 'SUCCESS') return 'SUCCESS';
    if (b.status === 'PENDING') return 'PENDING';
    if (b.ticketUrl) return 'SUCCESS';
    return 'PENDING';
};
