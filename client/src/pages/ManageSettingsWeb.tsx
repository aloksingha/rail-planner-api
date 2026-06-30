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
