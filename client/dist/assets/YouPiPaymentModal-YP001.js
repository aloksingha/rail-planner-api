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

    const handleClose=(e)=>{
        if(e){e.preventDefault();e.stopPropagation();}
        if(l.current)clearInterval(l.current);
        c();
    };

    return e.jsx("div",{
        onClick:(e)=>{if(e.target===e.currentTarget)handleClose(e)},
        style:{position:"fixed",inset:0,zIndex:999999,backgroundColor:"rgba(2, 6, 23, 0.92)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"},
        children:e.jsxs("div",{
            onClick:(e)=>e.stopPropagation(),
            style:{position:"relative",zIndex:1000000,width:"100%",maxWidth:"28rem",backgroundColor:"#0f172a",border:"1px solid rgba(51, 65, 85, 0.9)",borderRadius:"1.5rem",boxShadow:"0 25px 60px -15px rgba(0, 0, 0, 0.9)",overflow:"hidden",color:"#ffffff"},
            children:[
                e.jsxs("div",{
                    style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1.25rem",borderBottom:"1px solid #1e293b",backgroundColor:"#0f172a"},
                    children:[
                        e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem"},children:[
                            e.jsx("div",{style:{width:"2.25rem",height:"2.25rem",borderRadius:"0.75rem",backgroundColor:"rgba(16, 185, 129, 0.1)",border:"1px solid rgba(16, 185, 129, 0.25)",display:"flex",alignItems:"center",justifyContent:"center",color:"#34d399",fontWeight:"bold",fontSize:"1.125rem"},children:"\u20B9"}),
                            e.jsxs("div",{children:[
                                e.jsx("h3",{style:{margin:0,fontSize:"1rem",fontWeight:"900",color:"#ffffff",letterSpacing:"-0.025em"},children:"Direct UPI Payment"}),
                                e.jsx("p",{style:{margin:0,fontSize:"0.625rem",color:"#34d399",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"0% Platform Fee \u2022 Instant Verify"})
                            ]})
                        ]}),
                        e.jsx("button",{
                            type:"button",
                            onClick:handleClose,
                            style:{width:"2.25rem",height:"2.25rem",borderRadius:"9999px",backgroundColor:"#1e293b",border:"none",color:"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"1.125rem",fontWeight:"bold",transition:"all 0.15s"},
                            children:"\u2715"
                        })
                    ]
                }),
                p?e.jsxs("div",{style:{padding:"2rem",textAlign:"center",margin:"1rem 0"},children:[
                    e.jsx("div",{style:{width:"5rem",height:"5rem",borderRadius:"9999px",backgroundColor:"rgba(16, 185, 129, 0.2)",border:"2px solid rgba(16, 185, 129, 0.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",color:"#34d399",fontSize:"2.5rem"},children:"\u2713"}),
                    e.jsx("h4",{style:{fontSize:"1.25rem",fontWeight:"900",color:"#ffffff",margin:"0 0 0.5rem"},children:"Payment Verified!"}),
                    e.jsx("p",{style:{fontSize:"0.75rem",color:"#94a3b8",margin:0},children:"Your payment has been received and confirmed. Completing booking..."})
                ]}):e.jsxs("div",{style:{padding:"1.5rem",maxHeight:"78vh",overflowY:"auto"},children:[
                    e.jsxs("div",{style:{textAlign:"center",backgroundColor:"rgba(2, 6, 23, 0.7)",padding:"1rem",borderRadius:"1rem",border:"1px solid #1e293b"},children:[
                        e.jsx("p",{style:{margin:0,fontSize:"0.625rem",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em"},children:"Amount to Pay"}),
                        e.jsxs("div",{style:{fontSize:"2rem",fontWeight:"900",color:"#34d399",letterSpacing:"-0.025em",marginTop:"0.25rem"},children:["\u20B9",t.amount.toLocaleString()]}),
                        e.jsxs("div",{style:{marginTop:"0.5rem",display:"inline-flex",alignItems:"center",gap:"0.375rem",padding:"0.25rem 0.75rem",borderRadius:"9999px",backgroundColor:"rgba(245, 158, 11, 0.1)",border:"1px solid rgba(245, 158, 11, 0.2)",color:"#fcd34d",fontSize:"0.6875rem",fontWeight:"700"},children:[
                            e.jsx("span",{children:"\u23F1"}),
                            e.jsxs("span",{children:["Expires in: ",j,":",P]})
                        ]})
                    ]}),
                    e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",backgroundColor:"#ffffff",padding:"1rem",borderRadius:"1rem",border:"1px solid #334155",maxWidth:"220px",margin:"1rem auto"},children:[
                        e.jsx("img",{src:N,alt:"UPI QR Code",style:{width:"12rem",height:"12rem",borderRadius:"0.75rem",display:"block"}}),
                        e.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"0.625rem",color:"#0f172a",fontWeight:"800",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Scan with Any UPI App"})
                    ]}),
                    e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem",backgroundColor:"rgba(2, 6, 23, 0.8)",borderRadius:"0.75rem",border:"1px solid #1e293b",fontSize:"0.75rem",marginBottom:"0.75rem"},children:[
                        e.jsxs("div",{style:{minWidth:0,paddingRight:"0.5rem"},children:[
                            e.jsx("p",{style:{margin:0,fontSize:"0.5625rem",color:"#64748b",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Receiver UPI ID"}),
                            e.jsx("p",{style:{margin:0,fontFamily:"monospace",color:"#e2e8f0",fontWeight:"700",fontSize:"0.75rem",wordBreak:"break-all"},children:t.vpa})
                        ]}),
                        e.jsx("button",{type:"button",onClick:C,style:{padding:"0.375rem 0.75rem",borderRadius:"0.5rem",backgroundColor:"rgba(16, 185, 129, 0.1)",color:"#34d399",border:"1px solid rgba(16, 185, 129, 0.3)",fontSize:"0.625rem",fontWeight:"900",textTransform:"uppercase",letterSpacing:"0.05em",cursor:"pointer"},children:d?"Copied!":"Copy"})
                    ]}),
                    e.jsxs("div",{style:{marginBottom:"0.75rem"},children:[
                        e.jsx("p",{style:{margin:"0 0 0.375rem",fontSize:"0.625rem",color:"#94a3b8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em",textAlign:"center"},children:"Or Tap to Pay on Mobile"}),
                        e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0.5rem"},children:[
                            e.jsx("a",{href:t.upiUrl,style:{padding:"0.625rem 0.5rem",backgroundColor:"#1e293b",border:"1px solid #334155",borderRadius:"0.75rem",textAlign:"center",fontSize:"0.75rem",fontWeight:"700",color:"#e2e8f0",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"},children:"GPay"}),
                            e.jsx("a",{href:t.upiUrl,style:{padding:"0.625rem 0.5rem",backgroundColor:"#1e293b",border:"1px solid #334155",borderRadius:"0.75rem",textAlign:"center",fontSize:"0.75rem",fontWeight:"700",color:"#e2e8f0",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"},children:"PhonePe"}),
                            e.jsx("a",{href:t.upiUrl,style:{padding:"0.625rem 0.5rem",backgroundColor:"#1e293b",border:"1px solid #334155",borderRadius:"0.75rem",textAlign:"center",fontSize:"0.75rem",fontWeight:"700",color:"#e2e8f0",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center"},children:"Paytm"})
                        ]})
                    ]}),
                    e.jsxs("form",{onSubmit:T,style:{paddingTop:"0.5rem",borderTop:"1px solid #1e293b"},children:[
                        e.jsx("p",{style:{margin:"0 0 0.375rem",fontSize:"0.625rem",color:"#94a3b8",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em"},children:"Paid but waiting? Enter Bank UTR / Ref No."}),
                        e.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[
                            e.jsx("input",{type:"text",value:m,onChange:a=>g(a.target.value),placeholder:"12-digit UTR / Ref Number",style:{flex:1,backgroundColor:"#020617",border:"1px solid #1e293b",borderRadius:"0.75rem",padding:"0.5rem 0.75rem",fontSize:"0.75rem",fontFamily:"monospace",color:"#ffffff",outline:"none"}}),
                            e.jsx("button",{type:"submit",disabled:h,style:{padding:"0.5rem 1rem",backgroundColor:"#059669",color:"#ffffff",border:"none",borderRadius:"0.75rem",fontSize:"0.75rem",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.05em",cursor:h?"not-allowed":"pointer",opacity:h?0.5:1},children:h?"Checking...":"Verify"})
                        ]}),
                        f&&e.jsx("p",{style:{margin:"0.375rem 0 0",fontSize:"0.6875rem",color:"#fb7185",fontWeight:"500"},children:f})
                    ]}),
                    e.jsx("button",{
                        type:"button",
                        onClick:handleClose,
                        style:{width:"100%",padding:"0.625rem",textAlign:"center",fontSize:"0.75rem",fontWeight:"700",color:"#94a3b8",backgroundColor:"#1e293b",borderRadius:"0.75rem",border:"none",cursor:"pointer",marginTop:"0.75rem",transition:"all 0.15s"},
                        children:"\u2715 Cancel & Return to Booking"
                    })
                ]})
            ]
        })
    });
}
export{YouPiPaymentModal as default};
