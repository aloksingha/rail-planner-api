// Test: Add 3 corridors in sequence to check if multiple saves work
const https = require('https');

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function httpsPost(url, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'Authorization': `Bearer ${token}`
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

const TEST_CORRIDORS = [
    {
        name: 'Chennai-KOLKATA',
        originStations: '["MAS","MS","MSB","AJJ","KPD"]',
        destinationStations: '["HWH","KOAA","SDAH","BDC"]',
        markupSL: 1800, markup3A: 3200, markup2A: 3900
    },
    {
        name: 'DELHI-PATNA',
        originStations: '["NDLS","DLI","NZM","DEE","MGS"]',
        destinationStations: '["PNBE","DNR","PAT","RJPB"]',
        markupSL: 900, markup3A: 1600, markup2A: 2100
    }
];

async function main() {
    console.log('Getting token...');
    const { token } = await httpsGet('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
    console.log('Token OK');

    for (const c of TEST_CORRIDORS) {
        const result = await httpsPost('https://rail-planner-api.onrender.com/api/corridors', c, token);
        if (result.status === 200 && result.body.success) {
            console.log(`✅ ${c.name} added. ID: ${result.body.corridor.id}`);
        } else {
            console.error(`❌ ${c.name} failed:`, result.status, result.body);
        }
    }
}

main().catch(console.error);
