import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    Wallet, 
    Users, 
    Search, 
    History, 
    AlertTriangle, 
    CheckCircle2,
    Loader2,
    DollarSign,
    TrendingUp,
    PieChart as PieChartIcon,
    Activity
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { useMemo } from 'react';

interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | 'REFUND';
    description: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
}

interface UserSummary {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
    role: string;
}

interface WithdrawalRequest {
    id: string;
    userId: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
    method: string;
    details: string;
    adminComment?: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
        role: string;
    };
}

export default function WalletManagement() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [stats, setStats] = useState({ totalLiability: 0, totalTransactions: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [msg, setMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'BALANCES' | 'HISTORY' | 'WITHDRAWALS'>('BALANCES');

    // Modal state for adjustment
    const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('DEBIT');
    const [adjustDesc, setAdjustDesc] = useState('');
    const [isAdjusting, setIsAdjusting] = useState(false);
    
    // Processing state for withdrawals
    const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // Fetch Transactions & Stats
            try {
                const txRes = await axios.get('/api/wallet/admin/all-transactions', { headers });
                const txData = txRes.data?.transactions;
                setTransactions(Array.isArray(txData) ? txData : []);
                setStats({
                    totalLiability: Number(txRes.data?.totalLiability || 0),
                    totalTransactions: Number(txRes.data?.totalTransactions || 0)
                });
            } catch (err: any) {
                console.error('Transactions fetch failed:', err);
            }

            // Fetch Users
            try {
                const userRes = await axios.get('/api/admin/users', { headers });
                const userData = userRes.data?.users || userRes.data;
                setUsers(Array.isArray(userData) ? userData : []);
            } catch (err: any) {
                console.error('Users fetch failed:', err);
            }

            // Fetch Withdrawals
            try {
                const withdrawRes = await axios.get('/api/wallet/admin/withdrawals', { headers });
                setWithdrawals(Array.isArray(withdrawRes.data) ? withdrawRes.data : []);
            } catch (err: any) {
                console.error('Withdrawals fetch failed:', err);
            }

        } catch (error: any) {
            console.error('Overall wallet fetch failure', error);
            showMsg('Critical failure connecting to management API', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 5000);
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !adjustAmount || parseFloat(adjustAmount) <= 0) return;

        setIsAdjusting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/wallet/admin/adjust', {
                targetUserId: selectedUser.id,
                amount: parseFloat(adjustAmount),
                type: adjustType,
                description: adjustDesc
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showMsg(`Successfully ${adjustType.toLowerCase()}ed ₹${adjustAmount}`, 'success');
            setSelectedUser(null);
            setAdjustAmount('');
            setAdjustDesc('');
            fetchData();
        } catch (err: any) {
            showMsg(err.response?.data?.error || 'Adjustment failed', 'error');
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleProcessWithdrawal = async (id: string, status: 'COMPLETED' | 'REJECTED') => {
        const comment = prompt(`Enter ${status} note (Optional):`);
        setProcessingWithdrawal(id);
        
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/wallet/admin/process-withdrawal/${id}`, {
                status,
                adminComment: comment || ''
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showMsg(`Withdrawal marked as ${status.toLowerCase()}`, 'success');
            fetchData();
        } catch (err: any) {
            showMsg(err.response?.data?.error || 'Failed to process withdrawal', 'error');
        } finally {
            setProcessingWithdrawal(null);
        }
    };

    const formatCurrency = (val: any) => {
        const n = Number(val);
        return isNaN(n) ? '0' : n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    const filteredUsers = (Array.isArray(users) ? users : []).filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- CHART DATA PROCESSING ---
    const chartData = useMemo(() => {
        if (!transactions.length) return { line: [], bar: [] };

        // 1. Line Chart: Liability over last 30 days
        const dailyGroups: Record<string, number> = {};
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dailyGroups[d.toISOString().split('T')[0]] = 0;
        }

        transactions.forEach(tx => {
            const date = tx.createdAt.split('T')[0];
            if (dailyGroups[date] !== undefined) {
                // For liability, credits increase it, debits/refunds decrease it
                const impact = tx.type === 'CREDIT' ? tx.amount : -tx.amount;
                dailyGroups[date] += impact;
            }
        });

        const line = Object.entries(dailyGroups).map(([date, val]) => ({
            date: date.split('-').slice(1).join('/'), // MM/DD
            amount: val
        }));

        // 2. Bar Chart: Txn Distribution
        const counts = { CREDIT: 0, DEBIT: 0, REFUND: 0 };
        transactions.forEach(tx => {
            if (counts[tx.type] !== undefined) counts[tx.type]++;
        });

        const bar = [
            { name: 'Credits', count: counts.CREDIT, color: '#10b981' },
            { name: 'Debits', count: counts.DEBIT, color: '#f43f5e' },
            { name: 'Refunds', count: counts.REFUND, color: '#f59e0b' }
        ];

        return { line, bar };
    }, [transactions]);

    if (loading && transactions.length === 0) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="h-12 w-12 text-brand-blue animate-spin" />
            <p className="text-slate-400 font-black uppercase tracking-widest">Syncing Wallet Data</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 animate-in fade-in duration-500 pb-20 mt-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="h-1.5 w-6 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Financial Control Center</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        Wallet <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Admin</span>
                    </h1>
                </div>

                <div className="inline-flex items-center justify-center bg-[#050a14] border border-[#1a2235] p-1.5 rounded-[14px] h-auto shadow-2xl gap-1">
                    <button 
                        onClick={() => setActiveTab('BALANCES')}
                        className={`px-5 py-2 rounded-[10px] text-[13px] font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center justify-center leading-none ${
                            activeTab === 'BALANCES' 
                            ? 'bg-[#0ea5e9] text-white shadow-lg shadow-blue-500/20' 
                            : 'text-[#4b5563] hover:text-slate-300'
                        }`}
                    >
                        Balances
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-5 py-2 rounded-[10px] text-[13px] font-extrabold uppercase tracking-wider transition-all duration-200 flex items-center justify-center leading-none ${
                            activeTab === 'HISTORY' 
                            ? 'bg-[#0ea5e9] text-white shadow-lg shadow-blue-500/20' 
                            : 'text-[#4b5563] hover:text-slate-300'
                        }`}
                    >
                        Activity
                    </button>
                    <button 
                        onClick={() => setActiveTab('WITHDRAWALS')}
                        className={`px-5 py-2 rounded-[10px] text-[13px] font-extrabold uppercase tracking-wider transition-all duration-200 relative flex items-center justify-center leading-none ${
                            activeTab === 'WITHDRAWALS' 
                            ? 'bg-[#0ea5e9] text-white shadow-lg shadow-blue-500/20' 
                            : 'text-[#4b5563] hover:text-slate-300'
                        }`}
                    >
                        Withdrawals
                        {withdrawals.some(w => w.status === 'PENDING') && (
                            <span className="absolute top-1 right-2 h-1.5 w-1.5 bg-rose-500 rounded-full border border-[#050a14] animate-pulse" />
                        )}
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in slide-in-from-top-2 duration-300 ${
                    msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                    {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    <p className="font-bold text-sm tracking-tight">{msg.text}</p>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                            <Wallet size={24} />
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Platform Liability</h3>
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight">₹{formatCurrency(stats.totalLiability)}</p>
                </div>
 
                <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-blue/10 rounded-full blur-2xl group-hover:bg-brand-blue/20 transition-all duration-500" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Total Txns</h3>
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight">{stats.totalTransactions}</p>
                </div>
 
                <div className="bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                            <Users size={24} />
                        </div>
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Global Users</h3>
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight">{users.length}</p>
                </div>
            </div>

            {/* Financial Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#050a14] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                <Activity size={20} className="text-brand-blue" />
                                Liability Progression
                            </h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">30-Day Financial Trajectory</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData.line}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(val) => `₹${val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                                    itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#0ea5e9" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#050a14' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#050a14] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
                                <PieChartIcon size={20} className="text-emerald-500" />
                                Transaction Volume
                            </h3>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Distribution by Event Type</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.bar}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.03)'}}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {chartData.bar.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'BALANCES' && (
                <div className="animate-in slide-in-from-bottom-2 duration-500">
                    <div className="card-glow p-8 bg-slate-950/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 relative z-10 gap-4">
                            <div className="text-center sm:text-left">
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none mb-2">Identity Ledger</h1>
                                <p className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-widest ml-1">Universal Liquid Balances</p>
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input 
                                    className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-blue/50 transition-all w-full sm:w-72 shadow-sm"
                                    placeholder="Find identifying profile..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {filteredUsers.map(user => (
                                <button 
                                    key={user.id} 
                                    onClick={() => user.role !== 'SUPER_ADMIN' && setSelectedUser(user)}
                                    className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 hover:bg-white/5 hover:border-brand-blue/30 transition-all group relative overflow-hidden shadow-lg"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="h-16 w-16 rounded-[1.25rem] bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 flex items-center justify-center text-brand-blue text-2xl font-black shadow-lg group-hover:scale-110 transition-transform duration-500">
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div className="min-w-0 text-left">
                                            <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight truncate group-hover:text-brand-blue transition-colors">{user.name || 'Anonymous'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                                    user.role === 'SUPER_ADMIN' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                    user.role === 'ADMIN' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20' : 'bg-slate-800 text-slate-500 border-white/5'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className="text-emerald-600 dark:text-emerald-400 font-black text-2xl tracking-tight group-hover:scale-105 transition-transform origin-right">₹{formatCurrency(user.walletBalance)}</p>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Adjust Ledger</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="card-glow p-8 bg-slate-950/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
                    <div className="mb-10 flex items-center gap-4">
                        <History className="text-brand-blue" size={28} />
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none mb-1">Global Activity Stream</h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest ml-1">Real-time Transaction Ledger</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4">Timestamp</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map(tx => (
                                    <tr key={tx.id} className="group hover:bg-white/5 transition-all">
                                        <td className="py-4 pl-4">
                                            <p className="text-white text-xs font-bold">{new Date(tx.createdAt).toLocaleDateString()}</p>
                                            <p className="text-slate-500 text-[9px] font-bold uppercase">{new Date(tx.createdAt).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-white text-xs font-black">{tx.user?.name || tx.user?.email}</p>
                                            <p className="text-slate-500 text-[10px] font-medium italic">{tx.description}</p>
                                        </td>
                                        <td className="py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase ${
                                                tx.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                            }`}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={`py-4 pr-4 text-right font-black ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {tx.type === 'CREDIT' ? '+' : '-'} ₹{formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'WITHDRAWALS' && (
                <div className="card-glow p-8 animate-in slide-in-from-bottom-2 duration-500">
                    <h2 className="text-xl font-black text-white tracking-tight uppercase mb-8">Withdrawal Pipeline</h2>
                    <div className="space-y-4">
                        {withdrawals.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <History size={48} className="mx-auto mb-4" />
                                <p className="font-black uppercase tracking-widest text-sm">No payout requests found</p>
                            </div>
                        ) : (
                            withdrawals.map(w => (
                                <div key={w.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
                                                w.status === 'PENDING' ? 'bg-amber-500/20 text-amber-500' : 
                                                w.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                                            }`}>
                                                <DollarSign size={28} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-white">{w.user?.name || w.user?.email}</h3>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{w.user?.role}</span>
                                                </div>
                                                <p className="text-slate-400 text-sm font-bold mt-0.5">₹{formatCurrency(w.amount)} via {w.method} ({w.details})</p>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">{new Date(w.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {w.status === 'PENDING' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleProcessWithdrawal(w.id, 'REJECTED')}
                                                        disabled={!!processingWithdrawal}
                                                        className="px-6 py-4 rounded-2xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all disabled:opacity-50"
                                                    >
                                                        Discard
                                                    </button>
                                                    <button 
                                                        onClick={() => handleProcessWithdrawal(w.id, 'COMPLETED')}
                                                        disabled={!!processingWithdrawal}
                                                        className="relative group px-10 py-4 rounded-2xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.25em] hover:scale-[1.03] transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/10"
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-lg rounded-2xl" />
                                                        <span className="relative z-10">{processingWithdrawal === w.id ? 'Accessing Vault...' : 'Authorize Payout'}</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-right">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] ${
                                                        w.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                                    }`}>
                                                        {w.status}
                                                    </span>
                                                    {w.adminComment && (
                                                        <p className="text-[10px] text-slate-500 mt-2 italic font-medium max-w-[200px]">{w.adminComment}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modals remain the same but use the new setSelectedUser trigger */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex justify-center items-start">
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedUser(null)} />
                    <div className="my-auto relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 z-10">
                        <form onSubmit={handleAdjust} className="p-8">
                            <h2 className="text-2xl font-black text-white italic mb-8 uppercase tracking-tight">Manual Adjustment</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-6 text-white font-black text-xl"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider leading-relaxed">
                                        <AlertTriangle size={18} className="shrink-0" />
                                        <p>Manual credits are disabled. All top-ups must be initiated by users through the Razorpay gateway.</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setAdjustType('DEBIT')}
                                        className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest border transition-all bg-rose-500 text-white border-rose-500"
                                    >
                                        Manual Debit (Penalty/Refund)
                                    </button>
                                </div>

                                <textarea 
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs text-white h-24 focus:outline-none focus:border-brand-blue/50 transition-all"
                                    placeholder="Adjustment reason..."
                                    value={adjustDesc}
                                    onChange={(e) => setAdjustDesc(e.target.value)}
                                />

                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">Close</button>
                                    <button 
                                        type="submit" 
                                        disabled={isAdjusting || !adjustAmount} 
                                        className="flex-[2] py-4 bg-gradient-to-r from-brand-blue to-teal-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-brand-blue/20 disabled:opacity-50 hover:scale-[1.02] transition-all"
                                    >
                                        {isAdjusting ? 'Processing...' : 'Apply adjustment'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
