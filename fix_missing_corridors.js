// Fix: Add the 6 corridors that failed due to case mismatch (Chennai key)
const https = require('https');

const STATIONS = {
    GUWAHATI:   ['GHY', 'KYQ', 'APDJ'],
    AGARTALA:   ['AGTL', 'UAGC'],
    DIBRUGARH:  ['DBRG', 'DBRT'],
    CHENNAI:    ['MAS', 'MS', 'MSB', 'AJJ', 'PER'],
};

const MISSING = [
    ['GUWAHATI', 'CHENNAI', 'GUWAHATI-CHENNAI',      2800, 4500, 5200],
    ['AGARTALA', 'CHENNAI', 'AGARTALA-CHENNAI',       3000, 4800, 5600],
    ['DIBRUGARH','CHENNAI', 'DIBRUGARH-CHENNAI',      3200, 5100, 5900],
];

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); res.on('error',reject); }).on('error',reject);
    });
}
function httpsPost(url, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const urlObj = new URL(url);
        const req = https.request({ hostname:urlObj.hostname, path:urlObj.pathname, method:'POST', headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload),'Authorization':`Bearer ${token}`} }, res => {
            let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(d)})); res.on('error',reject);
        });
        req.on('error',reject); req.write(payload); req.end();
    });
}

async function main() {
    const { token } = await httpsGet('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
    const all = [];
    for (const [o, d, name, sl, a3, a2] of MISSING) {
        all.push({ name, o, d, sl, a3, a2 });
        all.push({ name: name.split('-').reverse().join('-'), o: d, d: o, sl, a3, a2 });
    }
    for (const c of all) {
        const body = { name: c.name, originStations: JSON.stringify(STATIONS[c.o]), destinationStations: JSON.stringify(STATIONS[c.d]), markupSL: c.sl, markup3A: c.a3, markup2A: c.a2 };
        const r = await httpsPost('https://rail-planner-api.onrender.com/api/corridors', body, token);
        console.log(r.status === 200 ? `✅ ${c.name}` : `❌ ${c.name}: ${r.body?.error}`);
    }
}
main().catch(console.error);
