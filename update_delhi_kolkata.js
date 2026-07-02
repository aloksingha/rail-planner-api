const https = require('https');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ error: 'invalid json', status: res.statusCode, data });
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function httpsPut(url, body, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'PUT',
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

async function main() {
    let token;
    console.log('Waiting for backend API to be ready (Render deploy might be ongoing)...');
    
    for (let i = 0; i < 20; i++) { // wait up to 2 minutes
        const res = await httpsGet('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
        if (res.token) {
            token = res.token;
            console.log('Backend is online! Token OK');
            break;
        }
        console.log('API not ready, retrying in 10s...');
        await sleep(10000);
    }

    if (!token) {
        console.error('Failed to get token after retries.');
        process.exit(1);
    }

    console.log('Fetching corridors...');
    const res = await httpsGet('https://rail-planner-api.onrender.com/api/corridors/public');
    const corridors = res.corridors;
    
    if (!corridors) {
        console.error('Failed to fetch corridors:', res);
        process.exit(1);
    }

    const targets = ['DELHI-KOLKATA', 'KOLKATA-DELHI'];
    for (const target of targets) {
        const c = corridors.find(x => x.name === target);
        if (c) {
            console.log(`Updating ${target} (ID: ${c.id})...`);
            const updateRes = await httpsPut(`https://rail-planner-api.onrender.com/api/corridors/${c.id}`, {
                name: c.name,
                markup2A: 4100
            }, token);
            
            if (updateRes.status === 200) {
                console.log(`✅ ${target} updated successfully to 4100 for 2A`);
            } else {
                console.error(`❌ ${target} failed:`, updateRes.status, updateRes.body);
            }
        } else {
            console.error(`❌ ${target} not found`);
        }
    }
}

main().catch(console.error);
