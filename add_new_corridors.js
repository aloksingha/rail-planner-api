/**
 * Add NE-South and Punjab/Haryana/Jammu corridors with vice versa
 * Run: node add_new_corridors.js
 */

const https = require('https');

const STATIONS = {
    GUWAHATI:   ['GHY', 'KYQ', 'APDJ'],
    AGARTALA:   ['AGTL', 'UAGC'],
    DIBRUGARH:  ['DBRG', 'DBRT'],
    SILCHAR:    ['SCL', 'SLCHAR'],
    JORHAT:     ['JT', 'JORHAT'],
    Chennai:    ['MAS', 'MS', 'MSB', 'AJJ', 'PER'],
    BANGALORE:  ['SBC', 'BNC', 'YPR', 'BYPL'],
    HYDERABAD:  ['HYB', 'SC', 'KI'],
    KOCHI:      ['ERS', 'ERN', 'KCVL'],
    THIRUVANANTHAPURAM: ['TVC', 'TVP'],
    COIMBATORE: ['CBE', 'COBE'],
    VISAKHAPATNAM: ['VSKP', 'VZM'],
    BHUBANESWAR: ['BBS', 'BBSR', 'CTC'],
    // NW Corridor
    DELHI:      ['NDLS', 'DLI', 'NZM', 'DEE', 'DEC', 'ANVT'],
    AMRITSAR:   ['ASR', 'ASR1'],
    CHANDIGARH: ['CDG', 'SRE', 'SSP'],
    JAMMU:      ['JAT', 'SVDK', 'JMM'],
    LUDHIANA:   ['LDH', 'LDHI'],
    PATHANKOT:  ['PTK', 'PTKC'],
    AMBALA:     ['UMB', 'UMB'],
    SHIMLA:     ['SML', 'SHIMLA'],
    DEHRADUN:   ['DDN', 'DHN'],
};

const NEW_ROUTES = [
    // Northeast to South
    ['GUWAHATI',   'CHENNAI',      'GUWAHATI-CHENNAI',      2800, 4500, 5200],
    ['GUWAHATI',   'BANGALORE',    'GUWAHATI-BANGALORE',    3000, 4800, 5600],
    ['GUWAHATI',   'HYDERABAD',    'GUWAHATI-HYDERABAD',    2500, 4000, 4700],
    ['GUWAHATI',   'KOCHI',        'GUWAHATI-KOCHI',        3200, 5100, 5900],
    ['GUWAHATI',   'THIRUVANANTHAPURAM', 'GUWAHATI-THIRUVANANTHAPURAM', 3400, 5400, 6200],
    ['GUWAHATI',   'COIMBATORE',   'GUWAHATI-COIMBATORE',   3000, 4800, 5600],
    ['GUWAHATI',   'VISAKHAPATNAM','GUWAHATI-VISAKHAPATNAM',2000, 3300, 3900],
    ['GUWAHATI',   'BHUBANESWAR',  'GUWAHATI-BHUBANESWAR',  1500, 2500, 3000],
    ['AGARTALA',   'CHENNAI',      'AGARTALA-CHENNAI',      3000, 4800, 5600],
    ['AGARTALA',   'BANGALORE',    'AGARTALA-BANGALORE',    3200, 5100, 5900],
    ['AGARTALA',   'HYDERABAD',    'AGARTALA-HYDERABAD',    2700, 4300, 5000],
    ['DIBRUGARH',  'CHENNAI',      'DIBRUGARH-CHENNAI',     3200, 5100, 5900],
    ['DIBRUGARH',  'BANGALORE',    'DIBRUGARH-BANGALORE',   3400, 5400, 6200],
    // Delhi-Punjab-Haryana-Jammu Corridor
    ['DELHI',      'JAMMU',        'DELHI-JAMMU',            650, 1100, 1450],
    ['DELHI',      'LUDHIANA',     'DELHI-LUDHIANA',         350,  620,  820],
    ['DELHI',      'PATHANKOT',    'DELHI-PATHANKOT',        500,  880, 1150],
    ['DELHI',      'AMBALA',       'DELHI-AMBALA',           200,  370,  490],
    ['DELHI',      'SHIMLA',       'DELHI-SHIMLA',           280,  500,  660],
    ['DELHI',      'DEHRADUN',     'DELHI-DEHRADUN',         300,  550,  720],
    ['AMRITSAR',   'JAMMU',        'AMRITSAR-JAMMU',         200,  370,  490],
    ['AMRITSAR',   'CHANDIGARH',   'AMRITSAR-CHANDIGARH',    150,  280,  370],
    ['CHANDIGARH', 'JAMMU',        'CHANDIGARH-JAMMU',       250,  460,  600],
    ['LUDHIANA',   'AMRITSAR',     'LUDHIANA-AMRITSAR',       80,  160,  210],
    ['LUDHIANA',   'JAMMU',        'LUDHIANA-JAMMU',         250,  450,  590],
    ['PATHANKOT',  'JAMMU',        'PATHANKOT-JAMMU',         90,  180,  240],
];

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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    console.log('Getting token...');
    const { token } = await httpsGet('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
    console.log('✅ Token OK\n');

    const allCorridors = [];
    for (const [origKey, destKey, name, sl, a3, a2] of NEW_ROUTES) {
        allCorridors.push({ name, origKey, destKey, sl, a3, a2 });
        allCorridors.push({
            name: name.split('-').reverse().join('-'),
            origKey: destKey, destKey: origKey, sl, a3, a2
        });
    }

    console.log(`Adding ${allCorridors.length} corridors...\n`);
    let added = 0, skipped = 0, failed = 0;

    for (const c of allCorridors) {
        if (!STATIONS[c.origKey] || !STATIONS[c.destKey]) {
            console.warn(`⚠ Missing stations for ${c.name} (${c.origKey} or ${c.destKey})`);
            failed++; continue;
        }
        const body = {
            name: c.name,
            originStations: JSON.stringify(STATIONS[c.origKey]),
            destinationStations: JSON.stringify(STATIONS[c.destKey]),
            markupSL: c.sl, markup3A: c.a3, markup2A: c.a2
        };
        const result = await httpsPost('https://rail-planner-api.onrender.com/api/corridors', body, token);
        if (result.status === 200 && result.body.success) {
            console.log(`✅ ${c.name}`);
            added++;
        } else if (result.body?.error?.includes('already exists')) {
            console.log(`⏭  ${c.name} [already exists]`);
            skipped++;
        } else {
            console.error(`❌ ${c.name}: ${result.body?.error}`);
            failed++;
        }
        await sleep(150);
    }

    console.log(`\n✅ Added: ${added} | ⏭ Skipped: ${skipped} | ❌ Failed: ${failed}`);
}

main().catch(console.error);
