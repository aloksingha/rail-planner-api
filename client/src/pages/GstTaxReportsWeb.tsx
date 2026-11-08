import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { 
    FileSpreadsheet, 
    FileText, 
    DownloadCloud, 
    RefreshCw, 
    Calendar, 
    Building2, 
    BadgePercent, 
    ArrowUpRight, 
    ReceiptText, 
    ShieldCheck, 
    ExternalLink, 
    Search,
    Printer,
    Info,
    HelpCircle
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';

interface GstInvoice {
    bookingId: string;
    invoiceNumber: string;
    invoiceDate: string;
    customerName: string;
    customerMobile: string;
    customerEmail: string;
    customerGstin: string;
    placeOfSupply: string;
    serviceDescription: string;
    bookingClass: string;
    sacCode: string;
    taxRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
    pdfUrl: string;
    downloadUrl: string;
}

interface GstSummary {
    totalInvoices: number;
    totalGrossTurnover: number;
    totalTaxableValue: number;
    totalCGST: number;
    totalSGST: number;
    totalIGST: number;
    totalTax: number;
    totalExemptTurnover: number;
    sacSummary: Array<{
        sac: string;
        description: string;
        rate: string;
        count: number;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalValue: number;
    }>;
}

interface SupplierInfo {
    legalName: string;
    tradeName: string;
    gstin: string;
    address: string;
    state: string;
    sacCode: string;
}

export default function GstTaxReportsWeb() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<GstSummary | null>(null);
    const [invoices, setInvoices] = useState<GstInvoice[]>([]);
    const [supplier, setSupplier] = useState<SupplierInfo | null>(null);

    // Date filters
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
    const [searchTerm, setSearchTerm] = useState('');

    const fetchGstReport = async () => {
        setLoading(true);
        try {
            let url = `/api/admin/gst-report?year=${selectedYear}`;
            if (selectedMonth !== 'all') {
                url += `&month=${selectedMonth}`;
            }
            const { data } = await axios.get(url);
            if (data.success) {
                setSummary(data.summary);
                setInvoices(data.invoices || []);
                setSupplier(data.supplierInfo);
            }
        } catch (error) {
            console.error('Failed to load GST tax report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGstReport();
    }, [selectedYear, selectedMonth]);

    const filteredInvoices = useMemo(() => {
        if (!searchTerm.trim()) return invoices;
        const q = searchTerm.toLowerCase();
        return invoices.filter(inv => 
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.customerName.toLowerCase().includes(q) ||
            inv.customerMobile.includes(q) ||
            inv.serviceDescription.toLowerCase().includes(q)
        );
    }, [invoices, searchTerm]);

    const handleExportGstr1 = (format: 'excel' | 'csv') => {
        const periodName = selectedMonth === 'all' ? `FY${selectedYear}` : `M${selectedMonth}_${selectedYear}`;
        const filename = `TicketsPro_GSTR1_${periodName}_${new Date().toISOString().split('T')[0]}`;

        // Transform into standardized GSTR-1 Filing Format
        const filingData = filteredInvoices.map((inv, idx) => ({
            'Sl. No': idx + 1,
            'Invoice Number': inv.invoiceNumber,
            'Invoice Date': inv.invoiceDate,
            'Invoice Value': inv.totalAmount,
            'Place Of Supply': inv.placeOfSupply,
            'Reverse Charge': 'N',
            'Applicable % of Tax Rate': `${inv.taxRate}%`,
            'Invoice Type': 'Regular B2C',
            'E-Commerce GSTIN': '',
            'Rate': inv.taxRate,
            'Taxable Value': inv.taxableAmount,
            'Cess Amount': 0,
            'Central Tax (CGST)': inv.cgst,
            'State Tax (SGST)': inv.sgst,
            'Integrated Tax (IGST)': inv.igst,
            'Customer Name': inv.customerName,
            'Customer Mobile': inv.customerMobile,
            'SAC Code': inv.sacCode,
            'Class': inv.bookingClass
        }));

        if (format === 'excel') exportToExcel(filingData, filename);
        if (format === 'csv') exportToCSV(filingData, filename);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header Banner */}
            <header className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                Statutory GST Compliant (Section 31)
                            </span>
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
                                SAC: 996411
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mt-3">
                            GST Tax Ledger & Return Reports
                        </h1>
                        <p className="text-slate-300 mt-1 font-medium text-sm">
                            Official outward supplies data for monthly GSTR-1 and GSTR-3B filings on the GST Portal (<a href="https://services.gst.gov.in" target="_blank" rel="noreferrer" className="text-cyan-400 underline">gst.gov.in</a>).
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchGstReport}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/10 transition-all active:rotate-180 text-white"
                            title="Refresh GST Data"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Registered Business Meta */}
                {supplier && (
                    <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">Supplier GSTIN</span>
                            <span className="text-white font-mono font-bold text-sm">{supplier.gstin}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">Legal Trade Name</span>
                            <span className="text-white font-semibold">{supplier.tradeName} ({supplier.legalName})</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">Principal Place of Business</span>
                            <span className="text-white font-medium truncate block">{supplier.address}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block uppercase font-bold text-[10px] tracking-wider">State Code</span>
                            <span className="text-emerald-400 font-bold">{supplier.state}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Filter Bar & Quick Export */}
            <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <Calendar size={16} className="text-indigo-400" />
                        <span>Tax Period:</span>
                    </div>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-950 border border-white/10 text-white text-xs font-semibold px-3 py-2 rounded-xl outline-none focus:border-indigo-500"
                    >
                        <option value="all">Full Year ({selectedYear})</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-slate-950 border border-white/10 text-white text-xs font-semibold px-3 py-2 rounded-xl outline-none focus:border-indigo-500"
                    >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleExportGstr1('excel')}
                        disabled={filteredInvoices.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
                    >
                        <FileSpreadsheet size={15} />
                        Download GSTR-1 Excel (.xlsx)
                    </button>
                    <button
                        onClick={() => handleExportGstr1('csv')}
                        disabled={filteredInvoices.length === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                        <FileText size={15} />
                        CSV
                    </button>
                </div>
            </div>

            {/* GSTR-3B Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Invoiced Revenue</span>
                        <p className="text-2xl font-black text-white mt-2">₹{summary.totalGrossTurnover.toLocaleString('en-IN')}</p>
                        <span className="text-[11px] text-slate-500 mt-1">{summary.totalInvoices} Invoices Issued</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Taxable Turnover (5% AC Rail)</span>
                        <p className="text-2xl font-black text-blue-300 mt-2">₹{summary.totalTaxableValue.toLocaleString('en-IN')}</p>
                        <span className="text-[11px] text-blue-400/70 mt-1">GSTR-3B Table 3.1(a)</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Total Tax Collected</span>
                        <p className="text-2xl font-black text-emerald-300 mt-2">₹{summary.totalTax.toLocaleString('en-IN')}</p>
                        <div className="flex gap-2 text-[10px] text-emerald-400/80 mt-1">
                            <span>CGST: ₹{summary.totalCGST}</span>
                            <span>·</span>
                            <span>SGST: ₹{summary.totalSGST}</span>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Exempt Turnover (Non-AC Sleeper)</span>
                        <p className="text-2xl font-black text-amber-300 mt-2">₹{summary.totalExemptTurnover.toLocaleString('en-IN')}</p>
                        <span className="text-[11px] text-amber-400/70 mt-1">GSTR-3B Table 3.1(c) (0% GST)</span>
                    </div>
                </div>
            )}

            {/* HSN / SAC Summary Table (Directly Copyable for Table 12 of GSTR-1) */}
            {summary && (
                <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="text-cyan-400" size={18} />
                            <h2 className="text-lg font-bold text-white">GSTR-1 Table 12: HSN / SAC Summary</h2>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Use these exact numbers for your monthly filing</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white/5 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-3">SAC Code</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">GST Rate</th>
                                    <th className="p-3">Tickets (Qty)</th>
                                    <th className="p-3 text-right">Taxable Value (₹)</th>
                                    <th className="p-3 text-right">CGST (₹)</th>
                                    <th className="p-3 text-right">SGST (₹)</th>
                                    <th className="p-3 text-right">Total Value (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                                {summary.sacSummary.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02]">
                                        <td className="p-3 font-mono font-bold text-cyan-400">{item.sac}</td>
                                        <td className="p-3 text-white font-semibold">{item.description}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                item.rate === '5%' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                                            }`}>
                                                {item.rate}
                                            </span>
                                        </td>
                                        <td className="p-3">{item.count}</td>
                                        <td className="p-3 text-right font-mono">₹{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400">₹{item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400">₹{item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-right font-mono font-bold text-white">₹{item.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Invoices Register Table */}
            <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ReceiptText className="text-emerald-400" size={18} />
                            GST Tax Invoice Register ({filteredInvoices.length} Invoices)
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Every booking generates an official Section 31 tax invoice</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                        <input
                            type="text"
                            placeholder="Search by invoice #, passenger, mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-950 border border-white/10 text-white text-xs pl-9 pr-4 py-2 rounded-xl outline-none focus:border-indigo-500 w-full md:w-72"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-white/5 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                            <tr>
                                <th className="p-3">Invoice No.</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Customer / Passenger</th>
                                <th className="p-3">POS State</th>
                                <th className="p-3">SAC</th>
                                <th className="p-3">Rate</th>
                                <th className="p-3 text-right">Taxable</th>
                                <th className="p-3 text-right">CGST</th>
                                <th className="p-3 text-right">SGST</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300 font-medium">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-slate-500 font-bold uppercase tracking-wider text-xs">
                                        No invoices recorded for this tax period.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.bookingId} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                                        <td className="p-3 text-slate-400 whitespace-nowrap">{inv.invoiceDate}</td>
                                        <td className="p-3">
                                            <p className="text-white font-semibold truncate max-w-[140px]">{inv.customerName}</p>
                                            <p className="text-[10px] text-slate-500">{inv.customerMobile}</p>
                                        </td>
                                        <td className="p-3 text-slate-400">{inv.placeOfSupply}</td>
                                        <td className="p-3 font-mono text-cyan-400">{inv.sacCode}</td>
                                        <td className="p-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                inv.taxRate > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                                            }`}>
                                                {inv.taxRate}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono">₹{inv.taxableAmount.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400">₹{inv.cgst.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400">₹{inv.sgst.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono font-bold text-white">₹{inv.totalAmount.toFixed(2)}</td>
                                        <td className="p-3 text-center">
                                            <a
                                                href={inv.downloadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 rounded text-[10px] font-bold border border-white/10 transition-all"
                                                title="View / Download PDF Invoice"
                                            >
                                                <ExternalLink size={12} />
                                                PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Step-by-Step Filing Guide for Accountant / Owner */}
            <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6">
                <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="text-amber-400" size={18} />
                    <h3 className="text-sm font-bold text-white">How to File GST Returns Using This Portal</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                        <p className="text-white font-bold flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">1</span>
                            Filing GSTR-1 (Outward Supplies by 11th of every month)
                        </p>
                        <p className="leading-relaxed">
                            Click <strong className="text-white">"Download GSTR-1 Excel (.xlsx)"</strong> above. Send this spreadsheet directly to your chartered accountant (CA) or upload it to GST Offline Tool / ClearTax. It contains B2C invoice details and Table 12 SAC Summary with 100% accurate SAC 996411 codes.
                        </p>
                    </div>

                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                        <p className="text-white font-bold flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                            Filing GSTR-3B (Monthly Summary & Tax Payment by 20th)
                        </p>
                        <p className="leading-relaxed">
                            Log into <strong className="text-white">gst.gov.in</strong> and open Table 3.1. Copy <strong className="text-blue-300">Taxable Turnover</strong>, <strong className="text-emerald-300">CGST</strong>, and <strong className="text-emerald-300">SGST</strong> from the summary cards above. Copy <strong className="text-amber-300">Exempt Turnover</strong> into Table 3.1(c).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
