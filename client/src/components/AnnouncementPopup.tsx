import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, X, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function AnnouncementPopup() {
    const [update, setUpdate] = useState<any>(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'platform_updates'), orderBy('updatedAt', 'desc'), limit(1));
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                setUpdate(data);

                // Show popup if news is new and user is NOT a Super Admin
                let currentUser: any = {};
                try {
                    currentUser = JSON.parse(sessionStorage.getItem('mimic_user') || localStorage.getItem('user') || '{}');
                } catch (e) { currentUser = {}; }

                if (currentUser.role && currentUser.role !== 'SUPER_ADMIN') {
                    const lastSeenVersion = localStorage.getItem('last_seen_platform_update');
                    if (data.version && data.version !== lastSeenVersion) {
                        setShowPopup(true);
                    }
                }
            } else {
                setUpdate(null);
            }
        });
        return () => unsub();
    }, []);

    if (!showPopup || !update || !update.version) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] border border-brand-orange/30 shadow-[0_0_100px_rgba(249,115,22,0.15)] overflow-hidden animate-in zoom-in-75 duration-700">
                {/* High Intensity Blinking Pulse Background */}
                <div className="absolute inset-0 bg-brand-orange/5" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/20 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
                
                <div className="relative p-8 lg:p-10 text-center">
                    <button 
                        onClick={() => {
                            localStorage.setItem('last_seen_platform_update', update.version);
                            setShowPopup(false);
                        }}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="inline-flex items-center justify-center p-5 rounded-[2rem] bg-brand-orange/20 text-brand-orange mb-8 shadow-2xl shadow-brand-orange/20 ring-4 ring-brand-orange/10 animate-bounce">
                        <Megaphone size={40} className="drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                             <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="flex h-2 w-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                <span className="text-[11px] font-black text-brand-orange uppercase tracking-[0.4em] italic">Live Intelligence Update</span>
                             </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-[0.9] italic mb-6">
                                {update.title}
                            </h2>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/5 shadow-inner">
                            <p className="text-slate-300 text-base leading-relaxed font-bold italic">
                                {update.content}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            localStorage.setItem('last_seen_platform_update', update.version);
                            setShowPopup(false);
                        }}
                        className="mt-8 w-full py-4 bg-brand-orange text-white font-black rounded-2xl shadow-lg shadow-brand-orange/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        GOT IT, THANKS!
                        <ArrowRight size={20} />
                    </button>

                    <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Dismissed notifications will stay in your dashboard tray
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
