import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PromoBannerSlider() {
    const [promotions, setPromotions] = useState<any[]>([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                const { data } = await axios.get('/api/promotions');
                if (data.success && data.promotions) {
                    setPromotions(data.promotions);
                }
            } catch (err) {
                console.error('Failed to fetch promotions for slider', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPromotions();
    }, []);

    useEffect(() => {
        if (promotions.length <= 1) return;
        const interval = setInterval(() => {
            setCurrent(prev => (prev + 1) % promotions.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [promotions]);

    if (loading || promotions.length === 0) return null;

    const promo = promotions[current];
    const apiBase = axios.defaults.baseURL || 'http://localhost:5000';
    const finalImageUrl = promo.imageUrl 
        ? (promo.imageUrl.startsWith('http') ? promo.imageUrl : `${apiBase}${promo.imageUrl}`) 
        : null;

    const handleActionClick = () => {
        if (!promo.linkUrl) return;
        if (promo.linkUrl.startsWith('http')) {
            window.open(promo.linkUrl, '_blank', 'noopener,noreferrer');
        } else {
            navigate(promo.linkUrl);
        }
    };

    const nextSlide = () => {
        setCurrent(prev => (prev + 1) % promotions.length);
    };

    const prevSlide = () => {
        setCurrent(prev => (prev - 1 + promotions.length) % promotions.length);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/5 bg-gradient-to-r from-slate-900 to-slate-950 text-white shadow-xl min-h-[160px] md:min-h-[140px] flex items-center group">
            {/* Nav Arrows */}
            {promotions.length > 1 && (
                <>
                    <button onClick={prevSlide} className="absolute left-4 z-20 p-2 rounded-full bg-black/30 hover:bg-black/60 border border-white/10 text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={nextSlide} className="absolute right-4 z-20 p-2 rounded-full bg-black/30 hover:bg-black/60 border border-white/10 text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 shrink-0">
                        <ChevronRight size={16} />
                    </button>
                </>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 relative"
                >
                    {/* Background glows */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex-1 space-y-3 relative z-10 text-left">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-brand-blue/20 rounded-lg border border-brand-blue/30 text-brand-blue">
                                <Sparkles size={12} className="animate-pulse" />
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-blue">Featured Offer</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none text-white italic">
                            {promo.title}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-300 font-medium max-w-xl">
                            {promo.description}
                        </p>

                        {promo.linkUrl && (
                            <button
                                onClick={handleActionClick}
                                className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-blue-600 text-white text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-brand-blue/20"
                            >
                                Learn More
                                <ExternalLink size={12} />
                            </button>
                        )}
                    </div>

                    {finalImageUrl && (
                        <div className="w-full md:w-[260px] h-[120px] md:h-[120px] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 relative z-10 bg-slate-950">
                            <img
                                src={finalImageUrl}
                                alt={promo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Slide Indicators */}
            {promotions.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                    {promotions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === current ? 'w-4 bg-brand-blue' : 'w-1.5 bg-white/20'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
