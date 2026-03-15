/**
 * Script to add DELHI-MUMBAI corridor pricing rule
 * Run: node add_corridor.js
 */

const https = require('https');

// Step 1: Get a SUPER_ADMIN bypass token
const bypassUrl = 'https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN';

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

async function main() {
    console.log('Step 1: Getting SUPER_ADMIN token...');
    const { token } = await httpsGet(bypassUrl);
    console.log('✅ Token obtained!');

    console.log('Step 2: Adding DELHI-MUMBAI corridor...');
    const result = await httpsPost(
        'https://rail-planner-api.onrender.com/api/corridors',
        {
            name: 'DELHI-MUMBAI',
            originStations: '["NDLS", "DLI", "NZM", "DEE", "DEC", "ANVT"]',
            destinationStations: '["MMCT", "CSMT", "BDTS", "PNVL"]',
            markupSL: 2500,
            markup3A: 4000,
            markup2A: 4700
        },
        token
    );

    if (result.status === 200 && result.body.success) {
        console.log('✅ DELHI-MUMBAI corridor added successfully!');
        console.log('Corridor ID:', result.body.corridor.id);
    } else {
        console.error('❌ Failed:', result.status, result.body);
    }
}

main().catch(console.error);
