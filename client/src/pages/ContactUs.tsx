import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, Phone, MapPin, MessageSquare, Send, CheckCircle2, Facebook, Edit2 } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

export default function ContactUs() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        email: 'support@ticketspro.in',
        phone: '1800-123-4567',
        address: '123 Express Hub, Tech Park Phase 2, Bengaluru, Karnataka 560100',
        whatsapp: '',
        facebook: '',
        telegram: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUserRole(decoded.role);
            } catch (err) {
                console.error('Invalid token', err);
            }
        }

        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/settings');
                if (data.success && data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            await axios.post('/api/contact', form);
            setSent(true);
            setForm({ name: '', email: '', subject: '', message: '' });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-teal-500 p-8 shadow-xl shadow-brand-blue/20">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20">
                            <MessageSquare className="text-white" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Contact Us</h1>
                            <p className="text-white/70 font-medium mt-1">We're here to help you 24/7. Reach out anytime.</p>
                        </div>
                    </div>

                    {userRole === 'SUPER_ADMIN' && (
                        <Link 
                            to="/manage-settings" 
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all font-bold text-sm backdrop-blur-sm group"
                        >
                            <Edit2 size={16} className="group-hover:rotate-12 transition-transform" />
                            Edit Settings
                        </Link>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Information Cards */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center group transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Mail className="text-brand-blue" size={24} />
                        </div>
                        <h3 className="text-white font-black mb-1">Email Support</h3>
                        <p className="text-slate-500 text-[10px] mb-3 uppercase font-black tracking-widest">Response within 24h</p>
                        <a href={`mailto:${settings.email}`} className="text-brand-blue font-black text-sm hover:underline">
                            {settings.email}
                        </a>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center group transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Phone className="text-brand-teal" size={24} />
                        </div>
                        <h3 className="text-white font-black mb-1">Phone Support</h3>
                        <p className="text-slate-500 text-[10px] mb-3 uppercase font-black tracking-widest">Available 9am - 6pm</p>
                        <a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`} className="text-brand-teal font-black text-sm hover:underline">
                            {settings.phone}
                        </a>
                    </div>

                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center group transition-all hover:-translate-y-1">
                        <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <MapPin className="text-brand-orange" size={24} />
                        </div>
                        <h3 className="text-white font-black mb-1">Headquarters</h3>
                        <p className="text-slate-400 text-[10px] text-balance whitespace-pre-line leading-relaxed font-bold uppercase tracking-tighter">
                            {settings.address}
                        </p>
                    </div>

                    {(settings.whatsapp || settings.facebook || settings.telegram) && (
                        <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5 space-y-4 flex flex-col items-center">
                            <h3 className="text-white font-bold text-[10px] uppercase tracking-[0.2em] opacity-50 text-center">Social Connect</h3>
                            <div className="flex justify-center gap-4">
                                {settings.whatsapp && (
                                    <a href={settings.whatsapp.startsWith('http') ? settings.whatsapp : (settings.whatsapp.includes('/') ? `https://wa.me/${settings.whatsapp}` : `https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`)} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="w-12 h-12 flex items-center justify-center bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal rounded-2xl border border-brand-teal/20 transition-all hover:scale-110 active:scale-95 group" 
                                       title="WhatsApp">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.03c0 2.12.553 4.189 1.605 6.046L0 24l6.115-1.605a11.804 11.804 0 005.932 1.583h.005c6.635 0 12.03-5.396 12.032-12.034a11.82 11.82 0 00-3.483-8.487" />
                                        </svg>
                                    </a>
                                )}
                                {settings.facebook && (
                                    <a href={settings.facebook.startsWith('http') ? settings.facebook : `https://${settings.facebook}`} target="_blank" rel="noopener noreferrer" 
                                       className="w-12 h-12 flex items-center justify-center bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-2xl border border-brand-blue/20 transition-all hover:scale-110 active:scale-95" 
                                       title="Facebook">
                                        <Facebook size={24} fill="currentColor" strokeWidth={0} />
                                    </a>
                                )}
                                {settings.telegram && (
                                    <a href={settings.telegram.startsWith('http') ? settings.telegram : `https://${settings.telegram}`} target="_blank" rel="noopener noreferrer" 
                                       className="w-12 h-12 flex items-center justify-center bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-2xl border border-sky-500/20 transition-all hover:scale-110 active:scale-95" 
                                       title="Telegram">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.891 7.021l-2.32 10.931c-.175.772-.631.961-1.276.599l-3.535-2.603-1.705 1.639c-.189.189-.347.347-.712.347l.253-3.593 6.541-5.91c.284-.252-.062-.392-.441-.139l-8.082 5.088-3.482-1.088c-.757-.236-.772-.757.158-1.118l13.611-5.245c.631-.231 1.185.149.982.899z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Contact Form */}
                <div className="md:col-span-2">
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-700/40 rounded-2xl p-8 shadow-2xl h-full">
                        <h2 className="text-xl font-bold text-white mb-6">Send us a message</h2>

                        {sent ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-16 h-16 rounded-full bg-brand-teal/20 flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-brand-teal" />
                                </div>
                                <h3 className="text-xl font-black text-white">Message Sent!</h3>
                                <p className="text-slate-400 text-sm text-center max-w-xs font-medium">
                                    Thanks! Our team will get back to you within 24 hours at <strong className="text-white">{form.email || 'your email'}</strong>.
                                </p>
                                <button onClick={() => setSent(false)} className="mt-2 text-sm text-brand-blue font-black uppercase tracking-widest hover:underline">
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {error && (
                                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl p-3">{error}</div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-400 ml-1">Full Name</label>
                                        <input name="name" type="text" required value={form.name} onChange={handleChange} placeholder="John Doe" className="input-field" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-400 ml-1">Email Address</label>
                                        <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@example.com" className="input-field" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 ml-1">Subject</label>
                                    <select name="subject" className="input-field appearance-none" required value={form.subject} onChange={handleChange}>
                                        <option value="" disabled>Select a topic...</option>
                                        <option value="Booking Assistance">Booking Assistance</option>
                                        <option value="Refund Status">Refund Status</option>
                                        <option value="Technical Support">Technical Support</option>
                                        <option value="General Feedback">General Feedback</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 ml-1">Message</label>
                                    <textarea name="message" required rows={5} value={form.message} onChange={handleChange} placeholder="How can we help you today?" className="input-field resize-none py-3" />
                                </div>
                                <button type="submit" disabled={sending} className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-4 disabled:opacity-50">
                                    <Send size={18} />
                                    {sending ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
