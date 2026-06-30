import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Mail, Phone, MapPin, Save, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function ManageSettings() {
    const [form, setForm] = useState({
        email: '',
        phone: '',
        address: '',
        whatsapp: '',
        facebook: '',
        telegram: ''
    });
    const [otaVersion, setOtaVersion] = useState('');
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
                        telegram: data.settings.telegram || ''
                    });
                    setOtaVersion(data.settings.otaVersion || 'None');
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
                <div className="w-12 h-12 border-4 border-brand-blue/20 rounded-full border-t-brand-blue animate-spin" />
                <p className="text-brand-blue font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="pb-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* ANDROID SCI-FI HEADER */}
            <div className="glass-panel p-6 mb-6 relative overflow-hidden group bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-white/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 bg-repeat bg-[length:24px_24px]" />
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-slate-200 dark:border-brand-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
                        <Settings className="text-brand-blue" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Global Settings</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest mt-1">Platform Configuration</p>
                    </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-brand-blue/50 via-teal-500/50 to-transparent" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {message.text && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in zoom-in duration-300 ${
                        message.type === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <p className="font-bold text-[10px] uppercase tracking-widest">{message.text}</p>
                    </div>
                )}

                {/* PRIMARY SUPPORT CONTACT */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contact Information</h3>
                    </div>

                    {/* Support Email */}
                    <div className="glass-panel p-4 hover:border-brand-blue/30 transition-colors bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <Mail className="text-brand-blue" size={16} />
                            <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Customer Support Email</label>
                        </div>
                        <input
                            type="email"
                            name="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/50 outline-none transition-all font-mono text-sm"
                            placeholder="support@ticketspro.in"
                        />
                    </div>

                    {/* Support Phone */}
                    <div className="glass-panel p-4 hover:border-emerald-500/30 transition-colors bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-3">
                            <Phone className="text-emerald-400" size={16} />
                            <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Customer Support Phone</label>
                        </div>
                        <input
                            type="text"
                            name="phone"
                            required
                            value={form.phone}
                            onChange={handleChange}
                            className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all font-mono text-sm"
                            placeholder="1800-123-4567"
                        />
                    </div>
                </div>

                {/* SOCIAL MEDIA CHANNELS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 ml-1 mt-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Social Media & Messaging</h3>
                    </div>

                    <div className="glass-panel p-5 space-y-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        {/* WhatsApp */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                WhatsApp Support
                            </label>
                            <input
                                type="text"
                                name="whatsapp"
                                value={form.whatsapp}
                                onChange={handleChange}
                                className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition-all text-xs font-mono"
                                placeholder="+91 9876543210"
                            />
                        </div>

                        {/* Facebook */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                Facebook Page
                            </label>
                            <input
                                type="text"
                                name="facebook"
                                value={form.facebook}
                                onChange={handleChange}
                                className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all text-xs font-mono"
                                placeholder="facebook.com/ticketspro"
                            />
                        </div>

                        {/* Telegram */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
                                Telegram Channel
                            </label>
                            <input
                                type="text"
                                name="telegram"
                                value={form.telegram}
                                onChange={handleChange}
                                className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-400/50 focus:border-sky-400/50 outline-none transition-all text-xs font-mono"
                                placeholder="t.me/ticketspro"
                            />
                        </div>
                    </div>
                </div>

                {/* HEADQUARTERS */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 ml-1 mt-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Office Address</h3>
                    </div>

                    <div className="glass-panel p-4 hover:border-rose-500/30 transition-colors group bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-2">
                            <MapPin className="text-rose-400" size={16} />
                            <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Office Address</label>
                        </div>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-3 leading-relaxed">Official address for support and business.</p>
                        <textarea
                            name="address"
                            required
                            rows={3}
                            value={form.address}
                            onChange={handleChange}
                            className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 outline-none transition-all font-mono text-xs resize-none"
                            placeholder="Enter full office address..."
                        />
                    </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-6 sticky bottom-4 z-20">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-brand-blue to-teal-500 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)] disabled:opacity-50 text-white rounded-2xl transition-all active:scale-95 border border-white/10 font-black uppercase tracking-[0.2em] text-[11px]"
                    >
                        {saving ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <Save size={16} />
                        )}
                        {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                </div>
            </form>
        </div>
    );
}
