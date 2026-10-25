import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, QrCode, Mail, Phone, MapPin, Save, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function ManageSettings() {
    const [form, setForm] = useState({
                email: '',
        phone: '',
        address: '',
        whatsapp: '',
        facebook: '',
        telegram: '',
        gstNo: '',
        youpiEnabled: true,
        paymentGatewayMode: 'BOTH',
        youpiVpa: 'ticketspro@upi',
        youpiMerchantName: 'TicketsPro',
        youpiBaseUrl: '',
        youpiMerchantKey: '',
        youpiWebhookSecret: ''
    });
    const [otaVersion, setOtaVersion] = useState('');
    const [otaUpdatedAt, setOtaUpdatedAt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [otaLoading, setOtaLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/settings');
                if (data.success && data.settings) {
                    setForm({
                                                email: data.settings.email || '',
                        phone: data.settings.phone || '',
                        address: data.settings.address || '',
                        whatsapp: data.settings.whatsapp || '',
                        facebook: data.settings.facebook || '',
                        telegram: data.settings.telegram || '',
                        gstNo: data.settings.gstNo || '',
                        youpiEnabled: data.settings.youpiEnabled ?? true,
                        paymentGatewayMode: data.settings.paymentGatewayMode || 'BOTH',
                        youpiVpa: data.settings.youpiVpa || 'ticketspro@upi',
                        youpiMerchantName: data.settings.youpiMerchantName || 'TicketsPro',
                        youpiBaseUrl: data.settings.youpiBaseUrl || '',
                        youpiMerchantKey: data.settings.youpiMerchantKey || '',
                        youpiWebhookSecret: data.settings.youpiWebhookSecret || ''
                    });
                    setOtaVersion(data.settings.otaVersion || 'None');
                    setOtaUpdatedAt(data.settings.updatedAt || '');
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
                setMessage({ type: 'error', text: 'Failed to load settings.' });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleOtaUpdate = async () => {
        if (!confirm('Are you sure you want to push the latest build on Firebase Hosting to all users as an OTA update? Users will be prompted to upgrade on their next app load.')) return;
        
        setOtaLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await axios.post('/api/settings/ota-update');
            if (data.success) {
                setOtaVersion(data.otaVersion);
                setOtaUpdatedAt(data.updatedAt || new Date().toISOString());
                setMessage({ type: 'success', text: `🚀 OTA update successfully pushed! Active version is now ${data.otaVersion}` });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to trigger OTA update.' });
        } finally {
            setOtaLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const { data } = await axios.patch('/api/settings', form);
            if (data.success) {
                setMessage({ type: 'success', text: 'Settings updated successfully!' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-slate-400 font-medium">Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 border border-white/5 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <Settings className="text-indigo-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Global Settings</h1>
                        <p className="text-slate-400 mt-1 font-medium">Manage site-wide contact information and support details.</p>
                    </div>
                </div>
            </header>

            {/* OVER-THE-AIR (OTA) LIVE DEPLOYMENT HUB */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-brand-blue/30 p-6 rounded-3xl space-y-4 shadow-xl shadow-brand-blue/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl">
                            <Sparkles className="text-brand-blue animate-pulse" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-white uppercase tracking-wider">Over-The-Air (OTA) Updates</h2>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Sync</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Broadcast new app versions to all mobile and web users instantly without re-installing.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleOtaUpdate}
                            disabled={otaLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-blue to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-brand-blue/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {otaLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {otaLoading ? 'Pushing OTA...' : '🚀 Push OTA Update to All Users'}
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/5 text-xs text-slate-400">
                    <div>
                        <span className="text-slate-500 uppercase tracking-widest text-[10px] block font-bold">Authorized OTA Version</span>
                        <span className="font-mono text-emerald-400 font-bold">{otaVersion || 'None'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 uppercase tracking-widest text-[10px] block font-bold">Last Update Date & Time</span>
                        <span className="font-mono text-sky-400 font-bold">{formatOtaTimestamp(otaVersion, otaUpdatedAt)}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 uppercase tracking-widest text-[10px] block font-bold">Deployment Host</span>
                        <span className="font-mono text-slate-300">Firebase Hosting (rail-planner-pro.web.app)</span>
                    </div>
                </div>
            </div>

                        {/* YOUPI DIRECT UPI PAYMENT GATEWAY (0% PLATFORM FEE) */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-emerald-500/30 p-6 rounded-3xl space-y-6 shadow-xl shadow-emerald-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <QrCode className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-white uppercase tracking-wider">YouPI Gateway (0% Fee)</h2>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Direct UPI</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Self-hosted 0% fee UPI gateway with instant SMS & notification observer.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.youpiEnabled}
                                onChange={(e) => setForm((prev: any) => ({ ...prev, youpiEnabled: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className="ml-3 text-xs font-black uppercase text-slate-300">{form.youpiEnabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                    </div>
                </div>

                {/* Gateway Mode Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Gateway Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { id: 'BOTH', title: 'Both (YouPI & Razorpay)', desc: 'Users choose Direct UPI or Cards/NetBanking' },
                            { id: 'YOUPI', title: 'YouPI Only (0% Fee)', desc: 'Exclusively Direct UPI (GPay, PhonePe, Paytm, QR)' },
                            { id: 'RAZORPAY', title: 'Razorpay Only', desc: 'Standard Razorpay aggregator checkout' }
                        ].map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setForm((prev: any) => ({ ...prev, paymentGatewayMode: m.id as any }))}
                                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                                    form.paymentGatewayMode === m.id
                                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                                        : 'bg-slate-950 border-white/5 text-slate-400 hover:border-slate-700'
                                }`}
                            >
                                <p className="font-bold text-xs uppercase tracking-wider">{m.title}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{m.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gateway Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receiver UPI VPA / ID</label>
                        <input
                            type="text"
                            name="youpiVpa"
                            value={form.youpiVpa}
                            onChange={handleChange}
                            placeholder="e.g. ticketspro@okaxis or merchant@upi"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm font-mono"
                        />
                        <p className="text-[10px] text-slate-500">The UPI ID receiving payments from customer QR & UPI apps.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Merchant Display Name</label>
                        <input
                            type="text"
                            name="youpiMerchantName"
                            value={form.youpiMerchantName}
                            onChange={handleChange}
                            placeholder="e.g. TicketsPro"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm"
                        />
                        <p className="text-[10px] text-slate-500">The display name customers see in GPay/PhonePe when scanning.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">YouPI Server URL (Optional)</label>
                        <input
                            type="text"
                            name="youpiBaseUrl"
                            value={form.youpiBaseUrl}
                            onChange={handleChange}
                            placeholder="e.g. https://youpi.yourdomain.com"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm font-mono"
                        />
                        <p className="text-[10px] text-slate-500">Leave empty to use direct NPCI UPI URI with observer webhook.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">YouPI Server API Key (Optional)</label>
                        <input
                            type="text"
                            name="youpiMerchantKey"
                            value={form.youpiMerchantKey}
                            onChange={handleChange}
                            placeholder="Your YouPI instance server API token"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm font-mono"
                        />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Webhook Secret (HMAC-SHA256)</label>
                        <input
                            type="text"
                            name="youpiWebhookSecret"
                            value={form.youpiWebhookSecret}
                            onChange={handleChange}
                            placeholder="Secret key for signing webhook payloads"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm font-mono"
                        />
                        <p className="text-[10px] text-slate-500">Provide this same secret in your YouPI gateway / APK settings to sign webhook notifications.</p>
                    </div>
                </div>

                {/* Webhook Endpoint Info Box */}
                <div className="bg-slate-950/80 border border-emerald-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">TicketsPro Webhook URL (Paste into YouPI)</p>
                        <p className="text-xs font-mono text-slate-300 break-all select-all">https://rail-planner-api.onrender.com/api/payments/youpi/webhook</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText('https://rail-planner-api.onrender.com/api/payments/youpi/webhook');
                            alert('Webhook URL copied to clipboard!');
                        }}
                        className="self-start sm:self-auto px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                    >
                        Copy URL
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message.text && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in duration-300 ${
                        message.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="font-semibold text-sm">{message.text}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Support Email */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4 hover:border-blue-500/30 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Mail className="text-blue-400" size={20} />
                            </div>
                            <label className="text-sm font-bold text-white uppercase tracking-wider">Support Email</label>
                        </div>
                        <input
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium"
                            placeholder="support@ticketspro.in"
                        />
                    </div>

                    {/* Support Phone */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4 hover:border-emerald-500/30 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                                <Phone className="text-emerald-400" size={20} />
                            </div>
                            <label className="text-sm font-bold text-white uppercase tracking-wider">Support Phone</label>
                        </div>
                        <input
                            type="text"
                            name="phone"
                            required
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium"
                            placeholder="1800-123-4567"
                        />
                    </div>
                </div>

                {/* Social Media Links */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                        Social Media Channels
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* WhatsApp */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                WhatsApp Number
                            </label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={form.whatsapp}
                                onChange={handleChange}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all text-sm"
                                placeholder="+91 9876543210"
                            />
                        </div>

                        {/* Facebook */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                Facebook URL
                            </label>
                            <input
                                type="text"
                                name="facebook"
                                value={form.facebook}
                                onChange={handleChange}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-600/50 outline-none transition-all text-sm"
                                placeholder="facebook.com/ticketspro"
                            />
                        </div>

                        {/* Telegram */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                                Telegram Link
                            </label>
                            <input
                                type="text"
                                name="telegram"
                                value={form.telegram}
                                onChange={handleChange}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-sky-500/50 outline-none transition-all text-sm"
                                placeholder="t.me/ticketspro"
                            />
                        </div>
                    </div>
                </div>

                {/* Headquarters Address */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4 hover:border-rose-500/30 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <MapPin className="text-rose-400" size={20} />
                        </div>
                        <label className="text-sm font-bold text-white uppercase tracking-wider">Headquarters Address</label>
                    </div>
                    <p className="text-xs text-slate-500">The physical office address shown in the footer and contact page.</p>
                    <textarea
                        name="address"
                        required
                        rows={3}
                        value={form.address}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all font-medium resize-none"
                        placeholder="Enter full office address..."
                    />
                </div>

                {/* GST Number */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-4 hover:border-amber-500/30 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <span className="text-amber-400 font-bold">GST</span>
                        </div>
                        <label className="text-sm font-bold text-white uppercase tracking-wider">GST Number</label>
                    </div>
                    <p className="text-xs text-slate-500">The Goods and Services Tax Identification Number for the company.</p>
                    <input
                        type="text"
                        name="gstNo"
                        value={form.gstNo}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none transition-all font-medium"
                        placeholder="e.g. 19BOOPA3821C1Z9"
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 group"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Save className="group-hover:rotate-12 transition-transform" size={20} />
                        )}
                        {saving ? 'Saving Changes...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
