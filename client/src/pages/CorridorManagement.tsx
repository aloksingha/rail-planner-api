import { useState, useEffect } from 'react';
import axios from 'axios';
import { Route, Plus, Trash2, Edit2, CheckCircle2, FileText, AlertCircle, Save, X, Search } from 'lucide-react';

interface Corridor {
    id: string;
    name: string;
    originStations: string;
    destinationStations: string;
    markupSL: number;
    markup3A: number;
    markup2A: number;
}

export default function CorridorManagement() {
    const [corridors, setCorridors] = useState<Corridor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [originStations, setOriginStations] = useState('["GHY", "KYQ"]');
    const [destinationStations, setDestinationStations] = useState('["SBC", "NDLS"]');
    const [markupSL, setMarkupSL] = useState<number | ''>('');
    const [markup3A, setMarkup3A] = useState<number | ''>('');
    const [markup2A, setMarkup2A] = useState<number | ''>('');

    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchCorridors();
    }, []);

    const fetchCorridors = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('/api/corridors', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCorridors(data.corridors);
        } catch (error) {
            console.error('Failed to fetch corridors', error);
            showMessage('Failed to load corridor pricing.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showMessage = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate JSON array strings
        try {
            const origins = JSON.parse(originStations);
            const dests = JSON.parse(destinationStations);
            if (!Array.isArray(origins) || !Array.isArray(dests)) throw new Error('Must be JSON array');
        } catch (err) {
            showMessage('Origin and Destination Stations must be valid JSON Arrays (e.g. ["GHY", "KYQ"]).', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { 
                name: name.trim(), 
                originStations: originStations.trim(), 
                destinationStations: destinationStations.trim(), 
                markupSL: Number(markupSL) || 0, 
                markup3A: Number(markup3A) || 0, 
                markup2A: Number(markup2A) || 0
            };

            if (isEditing && editingId) {
                const { data: updateRes } = await axios.put(`/api/corridors/${editingId}`, payload, config);
                const mirrorNote = updateRes.mirrorUpdated ? ' Reverse route also synced automatically! ↔️' : '';
                showMessage(`Corridor updated successfully!${mirrorNote}`, 'success');
            } else {
                await axios.post('/api/corridors', payload, config);
                showMessage(`✅ "${payload.name}" created! You can now add another corridor.`, 'success');
            }
            
            resetForm();
            await fetchCorridors();
        } catch (error: any) {
            console.error('Failed to save corridor:', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save corridor. Please try again.';
            showMessage(errMsg, 'error');
        } finally {
            setIsSaving(false); // ALWAYS reset — prevents stuck button
        }
    };

    const handleEdit = (c: Corridor) => {
        setIsEditing(true);
        setEditingId(c.id);
        setName(c.name);
        setOriginStations(c.originStations);
        setDestinationStations(c.destinationStations);
        setMarkupSL(c.markupSL);
        setMarkup3A(c.markup3A);
        setMarkup2A(c.markup2A);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will affect future ticket prices immediately.`)) return;
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`/api/corridors/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.success) {
                showMessage(`"${name}" deleted successfully.`, 'success');
                fetchCorridors();
            } else {
                showMessage(res.data?.error || 'Delete failed.', 'error');
            }
        } catch (error: any) {
            console.error('Failed to delete corridor', error);
            const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete corridor.';
            showMessage(errMsg, 'error');
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditingId(null);
        setName('');
        setOriginStations('');
        setDestinationStations('');
        setMarkupSL('');
        setMarkup3A('');
        setMarkup2A('');
        setIsSaving(false); // Safety net to always unlock the button
    };

    const filteredCorridors = corridors.filter(c => {
        const query = searchQuery.toLowerCase();
        return (
            c.name.toLowerCase().includes(query) ||
            c.originStations.toLowerCase().includes(query) ||
            c.destinationStations.toLowerCase().includes(query)
        );
    });

    return (
        <div className="bg-transparent pb-12 w-full">
            
            <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3">
                            <Route className="text-brand-blue" size={32} />
                            Corridor Pricing Management
                        </h1>
                        <p className="text-slate-400 mt-2">Create custom dynamic pricing rules for specific station corridors. These base prices will directly override the default system fare.</p>
                    </div>
                    <button 
                        onClick={async () => {
                            if (!confirm('This will add standard routes (like Secunderabad-NJP) if they are missing. Continue?')) return;
                            try {
                                const token = localStorage.getItem('token');
                                const { data } = await axios.post('/api/corridors/seed', {}, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                showMessage(data.message || 'Standard corridors synced!', 'success');
                                fetchCorridors();
                            } catch (e: any) {
                                console.error('Sync failed detail:', e.response);
                                const status = e.response?.status;
                                let msg = e.response?.data?.error || e.message || 'Sync failed';
                                if (status === 404) msg = 'Sync Endpoint Not Found (Backend may not be updated yet).';
                                if (status === 403) msg = 'Forbidden: You do not have permission to sync corridors.';
                                showMessage(msg, 'error');
                            }
                        }}
                        className="flex items-center gap-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue hover:text-brand-blue px-4 py-2.5 rounded-xl border border-brand-blue/20 transition-all text-xs font-bold active:scale-95"
                    >
                        <Save size={14} /> Sync Standard Corridors
                    </button>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${message.type === 'success' ? 'bg-brand-teal/10 border-brand-teal/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                        {message.type === 'success' ? <CheckCircle2 className="text-brand-teal shrink-0 mt-0.5" size={20} /> : <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                        <p className={`font-semibold ${message.type === 'success' ? 'text-brand-teal' : 'text-rose-300'}`}>{message.text}</p>
                    </div>
                )}

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   
                   {/* LEFT COLUMN: FORM */}
                   <div className="lg:col-span-1">
                       <form onSubmit={handleSave} className="card bg-surface/50 border border-slate-700/50 sticky top-24">
                           <div className="flex items-center justify-between mb-6">
                               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                  {isEditing ? <Edit2 size={20} className="text-brand-orange" /> : <Plus size={20} className="text-brand-teal" />}
                                  {isEditing ? 'Edit Corridor' : 'New Corridor'}
                               </h2>
                               {isEditing && (
                                   <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                                       <X size={14} /> Cancel
                                   </button>
                               )}
                           </div>
                           
                           <div className="space-y-5">
                               <div>
                                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Corridor Name</label>
                                   <input 
                                       type="text" 
                                       required
                                       value={name}
                                       onChange={(e) => setName(e.target.value)}
                                       placeholder="e.g. Northeast to South Premium"
                                       className="input-field shadow-sm"
                                   />
                               </div>
                               
                               <div>
                                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Origin Station Codes (JSON)</label>
                                   <textarea 
                                       required
                                       value={originStations}
                                       onChange={(e) => setOriginStations(e.target.value)}
                                       rows={2}
                                       className="input-field shadow-sm font-mono text-sm leading-relaxed text-blue-300"
                                   />
                                   <p className="text-[10px] text-slate-500 mt-1">Must be a valid JSON array of strings.</p>
                               </div>

                               <div>
                                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dest Station Codes (JSON)</label>
                                   <textarea 
                                       required
                                       value={destinationStations}
                                       onChange={(e) => setDestinationStations(e.target.value)}
                                       rows={2}
                                       className="input-field shadow-sm font-mono text-sm leading-relaxed text-pink-300"
                                   />
                               </div>

                               <div className="pt-4 border-t border-slate-700/50">
                                   <p className="text-sm font-bold text-white mb-3">Target Base Prices (₹)</p>
                                   <div className="grid grid-cols-3 gap-3">
                                       <div>
                                           <label className="text-[10px] text-slate-400 font-bold mb-1 block">SL Fare</label>
                                           <input type="number" min="0" required value={markupSL} onChange={(e) => setMarkupSL(e.target.value === '' ? '' : Number(e.target.value))} className="input-field text-center p-2 text-sm font-black" />
                                       </div>
                                       <div>
                                           <label className="text-[10px] text-slate-400 font-bold mb-1 block">3A Fare</label>
                                           <input type="number" min="0" required value={markup3A} onChange={(e) => setMarkup3A(e.target.value === '' ? '' : Number(e.target.value))} className="input-field text-center p-2 text-sm font-black" />
                                       </div>
                                       <div>
                                           <label className="text-[10px] text-slate-400 font-bold mb-1 block">2A Fare</label>
                                           <input type="number" min="0" required value={markup2A} onChange={(e) => setMarkup2A(e.target.value === '' ? '' : Number(e.target.value))} className="input-field text-center p-2 text-sm font-black" />
                                       </div>
                                   </div>
                               </div>

                               <button 
                                   type="submit" 
                                   disabled={isSaving}
                                   className="w-full bg-gradient-to-r from-brand-blue to-brand-teal hover:from-brand-teal hover:to-brand-blue text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] mt-6 shadow-lg shadow-brand-blue/20"
                               >
                                   <Save size={18} /> {isSaving ? 'Saving...' : (isEditing ? 'Update Corridor' : 'Save Corridor')}
                               </button>
                           </div>
                       </form>
                   </div>
                   
                   {/* RIGHT COLUMN: LIST */}
                   <div className="lg:col-span-2 flex flex-col gap-4">
                       <div className="relative">
                           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                               <Search className="h-5 w-5 text-slate-500" />
                           </div>
                           <input
                               type="text"
                               placeholder="Search corridors by name, origin, or destination code..."
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="w-full pl-11 pr-4 py-3.5 border border-slate-700/80 rounded-xl leading-5 bg-surface/50 text-white placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue/80 transition-all"
                           />
                       </div>

                       <div className="space-y-4">
                           {isLoading ? (
                               <div className="card text-center py-12 border border-slate-700/50 bg-surface/50">
                                   <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                   <p className="text-slate-400">Loading corridors...</p>
                               </div>
                           ) : filteredCorridors.length === 0 ? (
                               <div className="card text-center py-16 border border-slate-700/50 bg-surface/50">
                                   <FileText className="text-slate-600 mx-auto mb-4" size={48} />
                                   <h3 className="text-xl font-bold text-white mb-2">No Corridors Found</h3>
                                   <p className="text-slate-400 max-w-sm mx-auto">Try adjusting your search or create a new corridor to get started.</p>
                               </div>
                           ) : (
                               filteredCorridors.map((c) => (
                               <div key={c.id} className="card bg-surface/50 border border-slate-700/50 p-5 group hover:border-brand-blue/50 transition-colors">
                                   <div className="flex justify-between items-start mb-4">
                                       <div>
                                           <h3 className="text-lg font-bold text-white group-hover:text-brand-blue transition-colors">{c.name}</h3>
                                           <p className="text-xs text-slate-500 font-mono mt-1">ID: {c.id}</p>
                                       </div>
                                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={() => handleEdit(c)} className="p-2 bg-slate-800 hover:bg-brand-orange/20 text-slate-400 hover:text-brand-orange rounded-lg transition-colors" title="Edit Corridor">
                                               <Edit2 size={16} />
                                           </button>
                                            <button onClick={() => handleDelete(c.id, c.name)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors" title="Delete Corridor">
                                               <Trash2 size={16} />
                                           </button>
                                       </div>
                                   </div>
                                   
                                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                       <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1.5">Origins</p>
                                           <div className="flex flex-wrap gap-1.5">
                                               {JSON.parse(c.originStations).map((stn: string) => (
                                                  <span key={stn} className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded text-xs font-mono">{stn}</span> 
                                               ))}
                                           </div>
                                       </div>
                                       <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1.5">Destinations</p>
                                           <div className="flex flex-wrap gap-1.5">
                                               {JSON.parse(c.destinationStations).map((stn: string) => (
                                                  <span key={stn} className="px-2 py-0.5 bg-brand-teal/10 text-brand-teal border border-brand-teal/20 rounded text-xs font-mono">{stn}</span> 
                                               ))}
                                           </div>
                                       </div>
                                   </div>
                                   
                                   <div className="flex gap-4 pt-4 border-t border-slate-800/80">
                                       <div className="flex bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                                           <span className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold border-r border-slate-700/50">SL</span>
                                           <span className="px-4 py-1.5 text-white text-sm font-black tracking-wide">₹{c.markupSL}</span>
                                       </div>
                                       <div className="flex bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                                           <span className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold border-r border-slate-700/50">3A</span>
                                           <span className="px-4 py-1.5 text-white text-sm font-black tracking-wide">₹{c.markup3A}</span>
                                       </div>
                                       <div className="flex bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700/50">
                                           <span className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs font-bold border-r border-slate-700/50">2A</span>
                                           <span className="px-4 py-1.5 text-white text-sm font-black tracking-wide">₹{c.markup2A}</span>
                                       </div>
                                   </div>
                               </div>
                           ))
                       )}
                       </div>
                   </div>
               </div>
            </div>
        </div>
    );
}
