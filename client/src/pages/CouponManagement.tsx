import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Percent,
  CircleDollarSign,
  ToggleLeft,
  ToggleRight,
  Loader2
} from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minBookingAmount: number;
  maxDiscount: number | null;
  expiryDate: string | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minBookingAmount, setMinBookingAmount] = useState('0');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  const fetchCoupons = async () => {
    try {
      const { data } = await axios.get('/api/coupons');
      setCoupons(data);
    } catch (err) {
      setError('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await axios.post('/api/coupons', {
        code,
        discountType,
        discountValue,
        minBookingAmount: parseFloat(minBookingAmount),
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        expiryDate: expiryDate || null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null
      });
      
      setShowModal(false);
      resetForm();
      fetchCoupons();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create coupon');
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      await axios.put(`/api/coupons/${coupon.id}`, { isActive: !coupon.isActive });
      fetchCoupons();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this coupon permanently?')) return;
    setError('');
    setDeletingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      await axios.delete(`/api/coupons/${id}`);
      fetchCoupons();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete coupon');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMinBookingAmount('0');
    setMaxDiscount('');
    setExpiryDate('');
    setUsageLimit('');
  };

  if (loading) return <div className="p-8 text-white">Loading management console...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Tag className="text-brand-blue" size={32} />
            Coupon Management
          </h1>
          <p className="text-slate-400 mt-1">Create and manage discount codes for your customers.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-brand-blue/80 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-brand-blue/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Create New Coupon
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Coupon List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
            <Tag className="mx-auto text-slate-800 mb-4" size={48} />
            <p className="text-slate-500 font-bold text-xl">No active coupons found.</p>
            <p className="text-slate-600">Create your first discount code to get started.</p>
          </div>
        ) : coupons.map((coupon) => (
          <div 
            key={coupon.id}
            className={`relative overflow-hidden bg-slate-900/50 backdrop-blur-sm border ${coupon.isActive ? 'border-brand-blue/30' : 'border-slate-800'} rounded-3xl p-6 transition-all hover:bg-slate-900/80 group`}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 -m-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Tag size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="space-y-1">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Code</span>
                <h3 className="text-2xl font-black text-white tracking-tight">{coupon.code}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleToggleStatus(coupon)}
                  className={`p-2 rounded-xl transition-all ${coupon.isActive ? 'text-brand-teal bg-brand-teal/10' : 'text-slate-400 bg-slate-400/10'}`}
                >
                  {coupon.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
                <button 
                  onClick={() => handleDelete(coupon.id)}
                  disabled={deletingIds.has(coupon.id)}
                  className={`p-2 rounded-xl text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 transition-all ${deletingIds.has(coupon.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {deletingIds.has(coupon.id) ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={20} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-white/5 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Discount</span>
                <div className="flex items-center gap-1.5 text-white font-black">
                  {coupon.discountType === 'PERCENTAGE' ? <Percent size={14} className="text-brand-blue" /> : <CircleDollarSign size={14} className="text-brand-orange" />}
                  {coupon.discountValue}{coupon.discountType === 'PERCENTAGE' ? '%' : ' OFF'}
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Min. Order</span>
                <div className="text-white font-black">₹{coupon.minBookingAmount}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span>Usage</span>
                </div>
                <span className="text-white font-bold">
                  {coupon.usageCount} / {coupon.usageLimit || '∞'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar size={14} />
                  <span>Expiry</span>
                </div>
                <span className={`font-bold ${coupon.expiryDate && new Date() > new Date(coupon.expiryDate) ? 'text-rose-400' : 'text-white'}`}>
                  {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className={`mt-6 pt-4 border-t border-white/5 flex items-center gap-2 ${coupon.isActive ? 'text-brand-teal' : 'text-slate-400'}`}>
              {coupon.isActive ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span className="text-xs font-black uppercase tracking-wider">
                {coupon.isActive ? 'Active & Ready' : 'Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">Create Coupon</h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                  setError('');
                }} 
                className="text-slate-400 hover:text-white transition-colors"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Coupon Code</label>
                <input 
                  type="text"
                  placeholder="E.G. WELCOME10"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold placeholder:text-slate-600 focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                  <select 
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Value</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Min Booking</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={minBookingAmount}
                    onChange={(e) => setMinBookingAmount(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Total Limit</label>
                  <input 
                    type="number"
                    placeholder="Unlimited"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Expiry Date</label>
                <input 
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-2xl py-3 px-4 text-white font-bold outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-brand-blue hover:bg-brand-blue/80 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-brand-blue/20 active:scale-[0.98]"
              >
                Create Coupon Now
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
