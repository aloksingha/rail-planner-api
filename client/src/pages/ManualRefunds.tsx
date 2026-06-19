import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Clock, RefreshCcw } from 'lucide-react';

interface RefundRecord {
    id: string;
    paymentId: string;
    amount: number;
    status: string;
    originalFailureReason?: string;
    manualCreditDueDate?: string;
    createdAt: string;
}

export default function ManualRefunds() {
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRefunds = async () => {
        try {
            const { data } = await axios.get('/api/admin/refunds');
            setRefunds(data.refunds || []);
        } catch (error) {
            console.error('Failed to fetch refunds:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefunds();
        // Poll every 30 seconds
        const interval = setInterval(fetchRefunds, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleProcess = async (refundId: string, paymentId: string) => {
        if (!confirm(`Are you sure you have manually transferred the funds for Payment ID ${paymentId}? This will mark it as resolved.`)) return;
        setLoading(true);
        try {
            await axios.post(`/api/admin/refunds/${refundId}/resolve`);
            await fetchRefunds();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to resolve refund.');
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Vibrant Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-orange via-brand-teal to-brand-blue p-8 shadow-2xl shadow-brand-orange/30 group">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 rounded-full blur-2xl -ml-10 -mb-10" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20">
                        <AlertTriangle size={32} className="text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight data-[theme=light]:text-slate-900">Manual Refund Pipeline</h1>
                        <p className="text-brand-orange/70 text-sm mt-1 font-medium data-[theme=light]:text-brand-orange/70">Tracking and processing refunds that exhausted automated retries.</p>
                    </div>
                    <div className="md:ml-auto flex items-center gap-4">
                        <button onClick={fetchRefunds} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white font-bold flex items-center gap-2 hover:bg-white/20 transition-all shadow-lg active:scale-95">
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-glow p-0 data-[theme=light]:bg-white/90 data-[theme=light]:border-slate-200">
                {loading && refunds.length === 0 ? (
                    <div className="text-center py-10 text-primary flex flex-col items-center gap-3">
                        <RefreshCcw className="animate-spin" size={32} />
                        <p>Loading pending actions...</p>
                    </div>
                ) : refunds.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <span className="text-5xl block mb-4">🎉</span>
                        <h3 className="text-xl font-medium text-white mb-2">Zero Pending Manual Refunds</h3>
                        <p>The Razorpay retry mechanism is handling all transactions successfully.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-slate-400 data-[theme=light]:text-slate-600 data-[theme=light]:border-slate-100">
                                    <th className="p-4 font-medium">Payment Reference</th>
                                    <th className="p-4 font-medium">Amount</th>
                                    <th className="p-4 font-medium">Failure Reason</th>
                                    <th className="p-4 font-medium">SLA Due Date</th>
                                    <th className="p-4 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refunds.map(refund => {
                                    const dueDate = refund.manualCreditDueDate ? new Date(refund.manualCreditDueDate) : null;
                                    const isOverdue = dueDate ? dueDate < new Date() : false;

                                    return (
                                        <tr key={refund.id} className="border-b border-slate-700/50 hover:bg-white/5 transition-colors group data-[theme=light]:border-slate-100 data-[theme=light]:hover:bg-rose-500/5">
                                            <td className="p-4">
                                                <code className="bg-black/30 px-2 py-1 rounded text-slate-300 border border-slate-700 text-sm">
                                                    {refund.paymentId}
                                                </code>
                                            </td>
                                            <td className="p-4 font-bold text-white data-[theme=light]:text-slate-900">
                                                ₹{refund.amount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-warning max-w-[200px] truncate" title={refund.originalFailureReason}>
                                                {refund.originalFailureReason || "Unknown API Error"}
                                            </td>
                                            <td className="p-4">
                                                {dueDate ? (
                                                    <div className={`flex items-center gap-2 ${isOverdue ? "text-danger" : "text-slate-300"}`}>
                                                        <Clock size={16} />
                                                        <span>{dueDate.toLocaleDateString()}</span>
                                                        {isOverdue && <span className="text-xs font-bold uppercase bg-danger/20 px-1.5 py-0.5 rounded ml-1">Overdue</span>}
                                                    </div>
                                                ) : "N/A"}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleProcess(refund.id, refund.paymentId)}
                                                    className="btn-danger w-full text-sm py-1.5 group-hover:bg-danger group-hover:text-white transition-all shadow-md shadow-danger/10"
                                                >
                                                    Process Transfer
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
