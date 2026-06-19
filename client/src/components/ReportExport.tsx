import { useState, useMemo } from 'react';
import { FileSpreadsheet, FileText, DownloadCloud, Filter } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ReportExportProps {
    data: any[];
    filename: string;
    title: string;
    dateKey: string; // The property name in the data object that holds the date
}

type RangePreset = '7d' | '1m' | '3m' | '6m' | '1y' | 'custom' | 'all';

export default function ReportExport({ data, filename, title, dateKey }: ReportExportProps) {
    const [range, setRange] = useState<RangePreset>('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const filteredData = useMemo(() => {
        if (range === 'all') return data;

        const now = new Date();
        let startDate: Date | null = null;
        let endDate = new Date();

        if (range === '7d') {
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
        } else if (range === '1m') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 1);
        } else if (range === '3m') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 3);
        } else if (range === '6m') {
            startDate = new Date();
            startDate.setMonth(now.getMonth() - 6);
        } else if (range === '1y') {
            startDate = new Date();
            startDate.setFullYear(now.getFullYear() - 1);
        } else if (range === 'custom') {
            if (customStart) startDate = new Date(customStart);
            if (customEnd) {
                endDate = new Date(customEnd);
                endDate.setHours(23, 59, 59, 999);
            }
        }

        if (!startDate && range !== 'custom') return data;

        return data.filter(item => {
            const itemDate = new Date(item[dateKey]);
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
        });
    }, [data, range, customStart, customEnd, dateKey]);

    const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
        const exportFilename = `${filename}_${range === 'all' ? 'Full' : range}_${new Date().toISOString().split('T')[0]}`;
        
        // Transform data for export (flattening objects if needed)
        const exportData = filteredData.map(item => {
            const flat: any = {};
            Object.keys(item).forEach(key => {
                const val = item[key];
                if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                    Object.keys(val).forEach(subKey => {
                        flat[`${key}_${subKey}`] = val[subKey];
                    });
                } else {
                    flat[key] = val;
                }
            });
            return flat;
        });

        if (type === 'csv') exportToCSV(exportData, exportFilename);
        if (type === 'excel') exportToExcel(exportData, exportFilename);
        if (type === 'pdf') exportToPDF(exportData, exportFilename, title);
    };

    return (
        <div className="flex flex-col gap-4 bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/5 relative z-20">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Filter className="text-indigo-400" size={16} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Report Period</span>
                        <div className="flex items-center gap-2 mt-1">
                            <select 
                                value={range} 
                                onChange={(e) => setRange(e.target.value as RangePreset)}
                                className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500/50"
                            >
                                <option value="all">Full History</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="1m">Last 1 Month</option>
                                <option value="3m">Last 3 Months</option>
                                <option value="6m">Last 6 Months</option>
                                <option value="1y">Last 1 Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                {filteredData.length} records found
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handleExport('excel')} 
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-bold border border-emerald-500/20 transition-all active:scale-95"
                    >
                        <FileSpreadsheet size={14} /> Excel
                    </button>
                    <button 
                        onClick={() => handleExport('csv')} 
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-bold border border-blue-500/20 transition-all active:scale-95"
                    >
                        <FileText size={14} /> CSV
                    </button>
                    <button 
                        onClick={() => handleExport('pdf')} 
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-bold border border-rose-500/20 transition-all active:scale-95"
                    >
                        <DownloadCloud size={14} /> PDF
                    </button>
                </div>
            </div>

            {range === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">From</span>
                        <input 
                            type="date" 
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">To</span>
                        <input 
                            type="date" 
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                    </div>
                    {(customStart || customEnd) && (
                        <button 
                            onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase"
                        >
                            Reset
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
