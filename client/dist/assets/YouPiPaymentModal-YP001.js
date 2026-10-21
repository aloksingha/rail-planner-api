import{j as e,a as x}from"./index-D1i000XD.js";
import{a as r}from"./icons-DciIWsPJ.js";

function YouPiPaymentModal({isOpen:n,onClose:c,onSuccess:s,orderData:t}){
    const[d,u]=r.useState(!1),
    [m,g]=r.useState(""),
    [h,v]=r.useState(!1),
    [f,b]=r.useState(""),
    [p,k]=r.useState(!1),
    [y,w]=r.useState(600),
    l=r.useRef(null);

    r.useEffect(()=>{
        if(!n||!t){l.current&&clearInterval(l.current);return}
        k(!1),g(""),b(""),w(600);
        l.current=setInterval(async()=>{
            try{
                const S=localStorage.getItem("token"),
                {data:O}=await x.get(`/api/payments/youpi/status/${t.orderId}`,{headers:S?{Authorization:`Bearer ${S}`}:{}});
                O.status==="SUCCESS"&&(clearInterval(l.current),k(!0),setTimeout(()=>{s(O.bookingId)},1500))
            }catch(S){}
        },2500);
        const a=setInterval(()=>{
            w(S=>S<=1?(clearInterval(a),l.current&&clearInterval(l.current),0):S-1)
        },1000);
        return()=>{l.current&&clearInterval(l.current),clearInterval(a)}
    },[n,t]);

    if(!n||!t)return null;

    const C=()=>{navigator.clipboard.writeText(t.vpa),u(!0),setTimeout(()=>u(!1),2e3)},
    T=async a=>{
        if(a.preventDefault(),!m.trim()||m.trim().length<6){b("Please enter a valid 6-12 digit Bank UTR/Ref.");return}
        v(!0),b("");
        try{
            const S=localStorage.getItem("token"),
            {data:O}=await x.post("/api/payments/youpi/verify-utr",{orderId:t.orderId,utr:m.trim()},{headers:S?{Authorization:`Bearer ${S}`}:{}});
            O.success?(l.current&&clearInterval(l.current),k(!0),setTimeout(()=>{s(O.bookingId)},1500)):b(O.error||"Failed to verify UTR. Auto-sync is running...")
        }catch(S){b(S.response?.data?.error||"UTR verification failed. Please try again.")}
        finally{v(!1)}
    },
    j=Math.floor(y/60),
    P=(y%60).toString().padStart(2,"0"),
    N=`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(t.upiUrl)}`;

    return e.jsx("div",{className:"fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200",children:
        e.jsxs("div",{className:"relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white",children:[
            e.jsxs("div",{className:"flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60",children:[
                e.jsxs("div",{className:"flex items-center gap-2.5",children:[
                    e.jsx("div",{className:"w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold",children:"₹"}),
                    e.jsxs("div",{children:[
                        e.jsx("h3",{className:"text-base font-black text-white tracking-tight",children:"Direct UPI Payment"}),
                        e.jsx("p",{className:"text-[10px] text-emerald-400 font-bold uppercase tracking-wider",children:"0% Platform Fee • Instant Verify"})
                    ]})
                ]}),
                e.jsx("button",{type:"button",onClick:c,className:"w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm font-bold",children:"✕"})
            ]}),
            p?e.jsxs("div",{className:"p-8 text-center space-y-4 my-4",children:[
                e.jsx("div",{className:"w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 text-4xl animate-bounce",children:"✓"}),
                e.jsx("h4",{className:"text-xl font-black text-white",children:"Payment Verified!"}),
                e.jsx("p",{className:"text-xs text-slate-400",children:"Your payment has been received and confirmed. Completing booking..."})
            ]}):e.jsxs("div",{className:"p-6 space-y-5 max-h-[80vh] overflow-y-auto",children:[
                e.jsxs("div",{className:"text-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80",children:[
                    e.jsx("p",{className:"text-[10px] font-bold text-slate-400 uppercase tracking-widest",children:"Amount to Pay"}),
                    e.jsxs("div",{className:"text-3xl font-black text-emerald-400 tracking-tight mt-0.5",children:["₹",t.amount.toLocaleString()]}),
                    e.jsxs("div",{className:"mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold",children:[
                        e.jsx("span",{className:"animate-pulse",children:"⏱"}),
                        e.jsxs("span",{children:["Expires in: ",j,":",P]})
                    ]})
                ]}),
                e.jsxs("div",{className:"flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-inner border border-slate-700 max-w-[220px] mx-auto",children:[
                    e.jsx("img",{src:N,alt:"UPI QR Code",className:"w-48 h-48 rounded-xl object-contain block"}),
                    e.jsx("p",{className:"text-[10px] text-slate-900 font-bold uppercase tracking-wider mt-2",children:"Scan with Any UPI App"})
                ]}),
                e.jsxs("div",{className:"flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs",children:[
                    e.jsxs("div",{className:"min-w-0 pr-2",children:[
                        e.jsx("p",{className:"text-[9px] text-slate-500 font-bold uppercase tracking-wider",children:"Receiver UPI ID"}),
                        e.jsx("p",{className:"font-mono text-slate-200 font-bold truncate text-xs",children:t.vpa})
                    ]}),
                    e.jsx("button",{type:"button",onClick:C,className:"px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition-colors",children:d?"Copied!":"Copy"})
                ]}),
                e.jsxs("div",{className:"space-y-2",children:[
                    e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center",children:"Or Tap to Pay on Mobile"}),
                    e.jsxs("div",{className:"grid grid-cols-3 gap-2",children:[
                        e.jsx("a",{href:t.upiUrl,className:"py-2.5 px-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-center text-xs font-bold text-slate-200 transition-colors flex items-center justify-center",children:"GPay"}),
                        e.jsx("a",{href:t.upiUrl,className:"py-2.5 px-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-center text-xs font-bold text-slate-200 transition-colors flex items-center justify-center",children:"PhonePe"}),
                        e.jsx("a",{href:t.upiUrl,className:"py-2.5 px-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-center text-xs font-bold text-slate-200 transition-colors flex items-center justify-center",children:"Paytm"})
                    ]})
                ]}),
                e.jsxs("form",{onSubmit:T,className:"pt-2 border-t border-slate-800 space-y-2",children:[
                    e.jsx("p",{className:"text-[10px] text-slate-400 font-bold uppercase tracking-wider",children:"Paid but waiting? Enter Bank UTR / Ref No."}),
                    e.jsxs("div",{className:"flex gap-2",children:[
                        e.jsx("input",{type:"text",value:m,onChange:a=>g(a.target.value),placeholder:"12-digit UTR / Ref Number",className:"flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"}),
                        e.jsx("button",{type:"submit",disabled:h,className:"px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors",children:h?"Checking...":"Verify"})
                    ]}),
                    f&&e.jsx("p",{className:"text-[11px] text-rose-400 font-medium",children:f})
                ]})
            ]})
        ]})
    });
}
export{YouPiPaymentModal as default};
