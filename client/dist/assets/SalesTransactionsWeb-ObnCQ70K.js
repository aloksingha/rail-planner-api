import{j as e,a as o}from"./index-D1i000XD.js";import{a,c as u,h as b,W as g,i as j,aD as f,J as w,ap as E,aE as C,C as D,ao as R,aR as S}from"./icons-DciIWsPJ.js";import{R as T}from"./ReportExport-BGdNenP8.js";import"./charts-CJ7LU1mB.js";import"./pdf-export-BO05fxPA.js";import"./firebase-JmAEX3w6.js";import{u as XU,w as XW}from"./excel-export-C2K9OxTh.js";function F(){const initTab=(typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("tab")==="gst")?"gst":"sales";const[s,N]=a.useState(initTab),[gstData,setGstData]=a.useState(null),[r,y]=a.useState([]),[l,v]=a.useState([]),[i,k]=a.useState([]),[m,p]=a.useState(!0),h=async()=>{p(!0);try{if(s==="sales"){const c=(()=>{try{return JSON.parse(sessionStorage.getItem("mimic_user")||localStorage.getItem("user")||"{}")}catch{return{}}})()?.role==="SUPER_ADMIN"?"all":"me",{data:d}=await o.get(`/api/admin/transactions?scope=${c}`);y(d.payments||[])}else if(s==="wallet"){const{data:t}=await o.get("/api/wallet/history");v(t.transactions||[])}else if(s==="payouts"){const{data:t}=await o.get("/api/wallet/my-withdrawals");k(t||[])}else if(s==="gst"){const{data:t}=await o.get("/api/admin/gst-report");setGstData(t)}}catch(t){console.error(`Failed to fetch ${s} data`,t)}finally{p(!1)}};a.useEffect(()=>{h()},[s]);const n=({id:t,label:c,icon:d})=>e.jsxs("button",{onClick:()=>N(t),className:`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${s===t?"bg-brand-blue text-white shadow-xl shadow-brand-blue/20 scale-105":"bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300"}`,children:[e.jsx(d,{size:14}),c]});
const dlExcel = () => {
  if (!gstData || !gstData.invoices) return;
  const rows = gstData.invoices.map(inv => ({
    "Invoice Number": inv.invoiceNumber,
    "Invoice Date": inv.invoiceDate,
    "Customer Name": inv.customerName,
    "Customer Mobile": inv.customerMobile,
    "Place of Supply": inv.placeOfSupply,
    "SAC Code": inv.sacCode,
    "Tax Rate (%)": inv.taxRate,
    "Taxable Value (Rs)": inv.taxableAmount,
    "CGST (Rs)": inv.cgst,
    "SGST (Rs)": inv.sgst,
    "IGST (Rs)": inv.igst,
    "Total Invoice Value (Rs)": inv.totalAmount
  }));
  const ws = XU.json_to_sheet(rows);
  const wb = XU.book_new();
  XU.book_append_sheet(wb, ws, "GSTR-1 Invoices");
  XW(wb, "GSTR1_TicketsPro_" + (new Date().toISOString().slice(0,7)) + ".xlsx");
};
const dlCsv = () => {
  if (!gstData || !gstData.invoices) return;
  const h = ["Invoice Number","Invoice Date","Customer Name","Customer Mobile","Place of Supply","SAC Code","Tax Rate (%)","Taxable Value","CGST","SGST","IGST","Total Invoice Value"];
  const rows = gstData.invoices.map(i => [i.invoiceNumber, i.invoiceDate, '"'+i.customerName+'"', i.customerMobile, i.placeOfSupply, i.sacCode, i.taxRate, i.taxableAmount, i.cgst, i.sgst, i.igst, i.totalAmount]);
  const csv = [h.join(",")].concat(rows.map(r => r.join(","))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = "GSTR1_TicketsPro_" + (new Date().toISOString().slice(0,7)) + ".csv";
  aEl.click();
  URL.revokeObjectURL(url);
};

return e.jsxs("div",{className:"space-y-6 animate-in fade-in duration-500 pb-12",children:[e.jsxs("header",{className:"p-8 rounded-3xl bg-gradient-to-br from-brand-blue via-brand-teal to-emerald-500 shadow-2xl relative overflow-hidden",children:[e.jsx("div",{className:"absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none"}),e.jsxs("div",{className:"relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-4xl font-black text-white tracking-tighter uppercase italic",children:"My Ledger"}),e.jsx("p",{className:"text-white/80 mt-1 font-medium text-sm",children:"Comprehensive track of your sales, wallet, and payouts."})]}),e.jsx("button",{onClick:h,className:"bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/10 transition-all active:rotate-180 group",children:e.jsx(u,{size:20,className:`text-white ${m?"animate-spin":""}`})})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-3 mb-8",children:[e.jsx(n,{id:"sales",label:"Sales Ledger",icon:b}),e.jsx(n,{id:"wallet",label:"Wallet Activity",icon:g}),e.jsx(n,{id:"payouts",label:"My Payouts",icon:j}),e.jsx(n,{id:"gst",label:"GST Returns (GSTR-1 / 3B)",icon:b})]}),e.jsxs("div",{className:"card-glow border border-white/5 p-8 relative overflow-hidden",children:[e.jsxs("div",{className:"flex items-center justify-between mb-8",children:[e.jsxs("h2",{className:"text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3 italic",children:[s==="sales"&&e.jsxs(e.Fragment,{children:[e.jsx(b,{className:"text-brand-blue"})," Direct Sales"]}),s==="wallet"&&e.jsxs(e.Fragment,{children:[e.jsx(g,{className:"text-brand-teal"})," Wallet Trail"]}),s==="payouts"&&e.jsxs(e.Fragment,{children:[e.jsx(j,{className:"text-emerald-400"})," Payout Status"]}),s==="gst"&&e.jsxs(e.Fragment,{children:[e.jsx(b,{className:"text-emerald-400"})," GST Returns & GSTR-1 Ledger"]})]}),e.jsx("div",{className:"flex gap-2",children:e.jsx(T,{data:s==="sales"?r:s==="wallet"?l:i,filename:`TP_${s}_Report`,title:`${s.toUpperCase()} Records`,dateKey:"createdAt"})})]}),e.jsx("div",{className:"space-y-4",children:m?e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 gap-4 opacity-50",children:[e.jsx(u,{size:40,className:"text-brand-blue animate-spin"}),e.jsx("p",{className:"text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]",children:"Encrypting Ledger Data..."})]}):e.jsxs(e.Fragment,{children:[s==="sales"&&(r.length===0?e.jsx(x,{message:"No direct sales found in your ledger."}):r.map(t=>e.jsxs("div",{className:"p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex justify-between items-center hover:bg-white/[0.06] transition-all group/item",children:[e.jsxs("div",{className:"flex items-center gap-5",children:[e.jsx("div",{className:"w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue",children:e.jsx(f,{size:24})}),e.jsxs("div",{children:[e.jsxs("p",{className:"text-white font-black text-2xl tracking-tighter",children:["₹",t.amount.toLocaleString()]}),e.jsxs("p",{className:"text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2 text-balance",children:[e.jsx(w,{size:12})," ",new Date(t.createdAt).toLocaleString(),t.user&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"mx-2 opacity-30",children:"|"}),e.jsx(E,{size:12,className:"text-brand-blue"}),e.jsx("span",{className:"text-brand-blue",children:t.user.email})]})]})]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-2",children:[e.jsx("span",{className:`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${t.status==="CAPTURED"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":"bg-rose-500/10 text-rose-400 border-rose-500/20"}`,children:t.status}),e.jsxs("p",{className:"text-[9px] font-mono text-slate-600 uppercase",children:["TXN: ",t.paymentId]})]})]},t.id))),s==="wallet"&&(l.length===0?e.jsx(x,{message:"Your wallet activity log is empty."}):l.map(t=>e.jsxs("div",{className:"p-5 bg-white/[0.03] border border-white/5 rounded-2xl flex justify-between items-center hover:bg-white/[0.06] transition-all group/item",children:[e.jsxs("div",{className:"flex items-center gap-5",children:[e.jsx("div",{className:`w-12 h-12 rounded-xl flex items-center justify-center ${t.type==="CREDIT"?"bg-emerald-500/10 text-emerald-400":"bg-rose-500/10 text-rose-400"}`,children:t.type==="CREDIT"?e.jsx(f,{size:24}):e.jsx(C,{size:24})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-white font-black text-xl tracking-tight uppercase",children:t.description||"Adjustment"}),e.jsx("p",{className:"text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1",children:new Date(t.createdAt).toLocaleString()})]})]}),e.jsxs("p",{className:`text-2xl font-black tracking-tighter ${t.type==="CREDIT"?"text-emerald-400":"text-rose-400"}`,children:[t.type==="CREDIT"?"+":"-","₹",t.amount.toLocaleString()]})]},t.id))),s==="payouts"&&(i.length===0?e.jsx(x,{message:"No payout history found."}):i.map(t=>e.jsxs("div",{className:"p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group/item overflow-hidden relative",children:[e.jsxs("div",{className:"flex justify-between items-center relative z-10",children:[e.jsxs("div",{className:"flex items-center gap-5",children:[e.jsx("div",{className:`w-12 h-12 rounded-xl flex items-center justify-center ${t.status==="APPROVED"?"bg-emerald-500/10 text-emerald-400":t.status==="REJECTED"?"bg-rose-500/10 text-rose-400":"bg-brand-blue/10 text-brand-blue"}`,children:t.status==="APPROVED"?e.jsx(D,{size:24}):t.status==="REJECTED"?e.jsx(R,{size:24}):e.jsx(S,{size:24,className:"animate-spin-slow"})}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("p",{className:"text-white font-black text-2xl tracking-tighter",children:["₹",t.amount.toLocaleString()]}),e.jsx("div",{className:"flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20",children:e.jsxs("span",{className:"text-[10px] font-black text-orange-400 uppercase tracking-tighter",children:["Charge: ₹",t.charge]})})]}),e.jsx("p",{className:"text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1",children:new Date(t.createdAt).toLocaleString()})]})]}),e.jsxs("div",{className:"flex flex-col items-end gap-2",children:[e.jsx("span",{className:`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${t.status==="APPROVED"?"bg-emerald-500/10 text-emerald-400 border-emerald-500/20":t.status==="REJECTED"?"bg-rose-500/10 text-rose-400 border-rose-500/20":"bg-brand-blue/10 text-brand-blue border-brand-blue/20"}`,children:t.status}),t.remarks&&e.jsxs("p",{className:"text-[9px] text-slate-500 max-w-[200px] text-right italic",children:['"',t.remarks,'"']})]})]}),t.status==="PENDING"&&e.jsx("div",{className:"absolute bottom-0 left-0 w-full h-[2px] bg-brand-blue/20",children:e.jsx("div",{className:"h-full bg-brand-blue animate-[progress_2s_ease-in-out_infinite]",style:{width:"40%"}})})]},t.id))),s==="gst" && (
  !gstData ? e.jsx("div", { className: "text-center py-12 text-slate-500 font-bold text-xs uppercase tracking-widest", children: "Loading GST Returns & Ledger..." }) :
  e.jsxs("div", { className: "space-y-6 animate-in fade-in duration-300", children: [
    e.jsxs("div", { className: "p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4", children: [
      e.jsxs("div", { children: [
        e.jsxs("h3", { className: "text-xl font-black text-white uppercase tracking-tight", children: [gstData.supplierInfo?.tradeName || "Tickets Pro", " ", e.jsx("span", { className: "text-xs font-normal text-slate-400 lowercase", children: "(" + (gstData.supplierInfo?.legalName || "Pradip Enterprises") + ")" })] }),
        e.jsxs("p", { className: "text-xs text-slate-400 mt-1 font-mono", children: ["GSTIN: ", e.jsx("span", { className: "text-cyan-400 font-bold", children: gstData.supplierInfo?.gstin || "19BOOPA3821C1Z9" }), " | SAC: 996411 | State: 19 - West Bengal"] })
      ]}),
      e.jsxs("div", { className: "flex flex-wrap gap-2", children: [
        e.jsx("button", { onClick: dlExcel, className: "px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all", children: "Download GSTR-1 Excel (.xlsx)" }),
        e.jsx("button", { onClick: dlCsv, className: "px-4 py-2.5 rounded-xl bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/30 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all", children: "Download CSV" })
      ]})
    ]}),
    e.jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
      e.jsxs("div", { className: "p-5 rounded-2xl bg-white/[0.02] border border-white/5", children: [
        e.jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-500 font-bold", children: "Gross Turnover" }),
        e.jsxs("p", { className: "text-2xl font-black text-white mt-1", children: ["Rs. ", (gstData.summary?.totalGrossTurnover || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })] })
      ]}),
      e.jsxs("div", { className: "p-5 rounded-2xl bg-white/[0.02] border border-white/5", children: [
        e.jsx("p", { className: "text-[10px] uppercase tracking-widest text-emerald-400 font-bold", children: "Taxable Turnover (5% AC)" }),
        e.jsxs("p", { className: "text-2xl font-black text-emerald-400 mt-1", children: ["Rs. ", (gstData.summary?.totalTaxableValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })] })
      ]}),
      e.jsxs("div", { className: "p-5 rounded-2xl bg-white/[0.02] border border-white/5", children: [
        e.jsx("p", { className: "text-[10px] uppercase tracking-widest text-cyan-400 font-bold", children: "CGST (2.5%) + SGST (2.5%)" }),
        e.jsxs("p", { className: "text-2xl font-black text-cyan-400 mt-1", children: ["Rs. ", ((gstData.summary?.totalCGST || 0) + (gstData.summary?.totalSGST || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })] }),
        e.jsxs("p", { className: "text-[10px] text-slate-500 mt-0.5", children: ["CGST: Rs. " + (gstData.summary?.totalCGST || 0).toFixed(2) + " | SGST: Rs. " + (gstData.summary?.totalSGST || 0).toFixed(2)] })
      ]}),
      e.jsxs("div", { className: "p-5 rounded-2xl bg-white/[0.02] border border-white/5", children: [
        e.jsx("p", { className: "text-[10px] uppercase tracking-widest text-slate-400 font-bold", children: "0% Exempt (Non-AC Sleeper)" }),
        e.jsxs("p", { className: "text-2xl font-black text-slate-300 mt-1", children: ["Rs. ", (gstData.summary?.totalExemptTurnover || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })] }),
        e.jsx("p", { className: "text-[9px] text-slate-500 mt-0.5", children: "GST Notif. 12/2017" })
      ]})
    ]}),
    e.jsxs("div", { className: "p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3", children: [
      e.jsx("h4", { className: "text-sm font-bold text-white uppercase tracking-wider", children: "Table 12 - HSN / SAC Summary (Railway Passenger Services)" }),
      e.jsx("div", { className: "overflow-x-auto rounded-xl border border-white/5", children:
        e.jsxs("table", { className: "w-full text-xs text-left", children: [
          e.jsx("thead", { className: "bg-white/5 text-slate-400 uppercase font-bold text-[10px]", children:
            e.jsxs("tr", { children: [
              e.jsx("th", { className: "p-3", children: "SAC Code" }),
              e.jsx("th", { className: "p-3", children: "Description" }),
              e.jsx("th", { className: "p-3", children: "Tax Rate" }),
              e.jsx("th", { className: "p-3 text-right", children: "Taxable Value" }),
              e.jsx("th", { className: "p-3 text-right", children: "CGST Amount" }),
              e.jsx("th", { className: "p-3 text-right", children: "SGST Amount" }),
              e.jsx("th", { className: "p-3 text-right", children: "Total Value" })
            ]})
          }),
          e.jsx("tbody", { className: "divide-y divide-white/5 text-slate-300", children:
            (gstData.summary?.sacSummary || []).length === 0 ?
            e.jsx("tr", { children: e.jsx("td", { colSpan: 7, className: "p-4 text-center text-slate-500", children: "No SAC data recorded for current period." }) }) :
            (gstData.summary?.sacSummary || []).map((row, idx) =>
              e.jsxs("tr", { key: idx, className: "hover:bg-white/[0.02]", children: [
                e.jsx("td", { className: "p-3 font-mono font-bold text-cyan-400", children: row.sac }),
                e.jsx("td", { className: "p-3", children: row.description }),
                e.jsx("td", { className: "p-3 font-bold", children: row.taxRate + "%" }),
                e.jsx("td", { className: "p-3 text-right font-mono", children: row.taxableValue.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono text-emerald-400", children: row.cgst.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono text-emerald-400", children: row.sgst.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono font-bold text-white", children: row.totalValue.toFixed(2) })
              ]})
            )
          })
        ]})
      })
    ]}),
    e.jsxs("div", { className: "p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3", children: [
      e.jsxs("div", { className: "flex items-center justify-between", children: [
        e.jsx("h4", { className: "text-sm font-bold text-white", children: "GST Tax Invoices Register" }),
        e.jsxs("span", { className: "text-xs text-slate-400", children: [(gstData.invoices || []).length, " Registered Tax Invoices"] })
      ]}),
      e.jsx("div", { className: "overflow-x-auto rounded-xl border border-white/5", children:
        e.jsxs("table", { className: "w-full text-xs text-left", children: [
          e.jsx("thead", { className: "bg-white/5 text-slate-400 uppercase font-bold text-[10px]", children:
            e.jsxs("tr", { children: [
              e.jsx("th", { className: "p-3", children: "Invoice No" }),
              e.jsx("th", { className: "p-3", children: "Date" }),
              e.jsx("th", { className: "p-3", children: "Customer" }),
              e.jsx("th", { className: "p-3", children: "POS" }),
              e.jsx("th", { className: "p-3", children: "Rate" }),
              e.jsx("th", { className: "p-3 text-right", children: "Taxable" }),
              e.jsx("th", { className: "p-3 text-right", children: "CGST" }),
              e.jsx("th", { className: "p-3 text-right", children: "SGST" }),
              e.jsx("th", { className: "p-3 text-right", children: "Total" }),
              e.jsx("th", { className: "p-3 text-center", children: "Invoice PDF" })
            ]})
          }),
          e.jsx("tbody", { className: "divide-y divide-white/5 text-slate-300", children:
            (gstData.invoices || []).length === 0 ?
            e.jsx("tr", { children: e.jsx("td", { colSpan: 10, className: "p-6 text-center text-slate-500 font-bold", children: "No invoices found in this period." }) }) :
            (gstData.invoices || []).map(inv =>
              e.jsxs("tr", { key: inv.bookingId, className: "hover:bg-white/[0.02]", children: [
                e.jsx("td", { className: "p-3 font-mono font-bold text-white", children: inv.invoiceNumber }),
                e.jsx("td", { className: "p-3 text-slate-400", children: inv.invoiceDate }),
                e.jsxs("td", { className: "p-3", children: [
                  e.jsx("p", { className: "font-bold text-white", children: inv.customerName }),
                  e.jsx("p", { className: "text-[10px] text-slate-500", children: inv.customerMobile })
                ]}),
                e.jsx("td", { className: "p-3 text-slate-400", children: inv.placeOfSupply }),
                e.jsx("td", { className: "p-3 font-bold", children: inv.taxRate + "%" }),
                e.jsx("td", { className: "p-3 text-right font-mono", children: "Rs. " + inv.taxableAmount.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono text-emerald-400", children: "Rs. " + inv.cgst.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono text-emerald-400", children: "Rs. " + inv.sgst.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-right font-mono font-bold text-white", children: "Rs. " + inv.totalAmount.toFixed(2) }),
                e.jsx("td", { className: "p-3 text-center", children:
                  e.jsx("a", {
                    href: inv.downloadUrl,
                    target: "_blank",
                    rel: "noreferrer",
                    className: "px-2 py-1 bg-white/5 hover:bg-white/10 text-cyan-400 rounded text-[10px] font-bold border border-white/10 inline-block",
                    children: "View PDF"
                  })
                })
              ]})
            )
          })
        ]})
      })
    ]}),
    e.jsxs("div", { className: "p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed", children: [
      e.jsx("strong", { className: "text-amber-300 block mb-1", children: "Tax Filing Deadlines:" }),
      "• GSTR-1 (Outward Supplies): File by the 11th of each month using the downloaded Excel spreadsheet.",
      e.jsx("br", {}),
      "• GSTR-3B (Summary Return & Tax Payment): File by the 20th of each month using the summary numbers above on gst.gov.in."
    ]})
  ]})
)]})})]})]})}function x({message:s}){return e.jsxs("div",{className:"flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/5 rounded-3xl",children:[e.jsx("div",{className:"w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center",children:e.jsx(w,{className:"text-slate-700",size:32})}),e.jsx("p",{className:"text-slate-500 font-bold uppercase tracking-widest text-[10px]",children:s})]})}export{F as default};
