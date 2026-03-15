/**
 * Bulk Corridor Pricing Seeder
 * Adds all major Indian train route corridors with BOTH directions (source→dest and dest→source)
 * Run: node bulk_corridors.js
 */

const https = require('https');

// ─── Station Code Definitions ─────────────────────────────────────────────────
const STATIONS = {
    DELHI:     ['NDLS', 'DLI', 'NZM', 'DEE', 'DEC', 'ANVT'],
    MUMBAI:    ['MMCT', 'CSMT', 'BDTS', 'PNVL', 'DR', 'LTT'],
    CHENNAI:   ['MAS', 'MS', 'MSB', 'AJJ', 'PER'],
    BANGALORE: ['SBC', 'BNC', 'YPR', 'BYPL', 'KJM'],
    KOLKATA:   ['HWH', 'KOAA', 'SDAH', 'BDC', 'KGP'],
    HYDERABAD: ['HYB', 'SC', 'KI', 'NED', 'BMO'],
    PATNA:     ['PNBE', 'DNR', 'PAT', 'RJPB', 'BKP'],
    LUCKNOW:   ['LKO', 'LJN', 'BMK', 'ASH'],
    JAIPUR:    ['JP', 'JPF', 'SOJT'],
    AMRITSAR:  ['ASR', 'ASR1'],
    PUNE:      ['PUNE', 'GC', 'DND', 'LNL'],
    AHMEDABAD: ['ADI', 'ST', 'BRC', 'VDR'],
    BHOPAL:    ['BPL', 'HBJ', 'ET'],
    NAGPUR:    ['NGP', 'NGPK', 'BSL'],
    GUWAHATI:  ['GHY', 'KYQ', 'APDJ'],
    BHUBANESWAR: ['BBS', 'BBSR', 'CTC', 'BRCB'],
    CHANDIGARH: ['CDG', 'SRE'],
    KOCHI:     ['ERS', 'ERN', 'KCVL', 'AWY'],
    THIRUVANANTHAPURAM: ['TVC', 'TVP', 'TRIVANDRUM'],
    VARANASI:  ['BSB', 'MGS', 'DDU'],
    AGRA:      ['AGC', 'AF', 'AGCW'],
    COIMBATORE: ['CBE', 'COBE'],
    VISAKHAPATNAM: ['VSKP', 'VZM'],
    RAIPUR: ['R', 'RAIPUR'],
};

// ─── Route Definitions (A→B with prices) ─────────────────────────────────────
// [originKey, destKey, name, sl, 3a, 2a]
// Vice-versa corridors (B→A) will be auto-generated with same prices
const ROUTES = [
    // Delhi Hub
    ['DELHI',     'MUMBAI',    'DELHI-MUMBAI',         2500, 4000, 4700],
    ['DELHI',     'CHENNAI',   'DELHI-CHENNAI',         2800, 4500, 5200],
    ['DELHI',     'BANGALORE', 'DELHI-BANGALORE',       3000, 4800, 5600],
    ['DELHI',     'KOLKATA',   'DELHI-KOLKATA',         1800, 3000, 3600],
    ['DELHI',     'HYDERABAD', 'DELHI-HYDERABAD',       2200, 3500, 4200],
    ['DELHI',     'GUWAHATI',  'DELHI-GUWAHATI',        1500, 2500, 3000],
    ['DELHI',     'PATNA',     'DELHI-PATNA',            900, 1600, 2100],
    ['DELHI',     'LUCKNOW',   'DELHI-LUCKNOW',          500,  900, 1200],
    ['DELHI',     'JAIPUR',    'DELHI-JAIPUR',           300,  600,  800],
    ['DELHI',     'AMRITSAR',  'DELHI-AMRITSAR',         400,  750, 1000],
    ['DELHI',     'BHUBANESWAR','DELHI-BHUBANESWAR',    2000, 3200, 3800],
    ['DELHI',     'AHMEDABAD', 'DELHI-AHMEDABAD',        900, 1500, 1900],
    ['DELHI',     'PUNE',      'DELHI-PUNE',            1600, 2600, 3200],
    ['DELHI',     'BHOPAL',    'DELHI-BHOPAL',           700, 1200, 1600],
    ['DELHI',     'NAGPUR',    'DELHI-NAGPUR',          1300, 2100, 2600],
    ['DELHI',     'CHANDIGARH','DELHI-CHANDIGARH',       250,  450,  600],
    ['DELHI',     'AGRA',      'DELHI-AGRA',             180,  320,  420],
    ['DELHI',     'VARANASI',  'DELHI-VARANASI',         650, 1100, 1450],
    ['DELHI',     'VISAKHAPATNAM','DELHI-VISAKHAPATNAM',2300, 3700, 4400],
    // Mumbai Hub
    ['MUMBAI',    'CHENNAI',   'MUMBAI-CHENNAI',        1100, 2000, 2400],
    ['MUMBAI',    'BANGALORE', 'MUMBAI-BANGALORE',       800, 1400, 1800],
    ['MUMBAI',    'KOLKATA',   'MUMBAI-KOLKATA',        2000, 3200, 3900],
    ['MUMBAI',    'HYDERABAD', 'MUMBAI-HYDERABAD',       700, 1200, 1600],
    ['MUMBAI',    'PUNE',      'MUMBAI-PUNE',            150,  300,  400],
    ['MUMBAI',    'AHMEDABAD', 'MUMBAI-AHMEDABAD',       280,  500,  650],
    ['MUMBAI',    'GUWAHATI',  'MUMBAI-GUWAHATI',       2500, 4000, 4800],
    ['MUMBAI',    'BHUBANESWAR','MUMBAI-BHUBANESWAR',   1600, 2700, 3200],
    ['MUMBAI',    'NAGPUR',    'MUMBAI-NAGPUR',          600, 1100, 1400],
    ['MUMBAI',    'PATNA',     'MUMBAI-PATNA',          1700, 2800, 3400],
    // Chennai Hub
    ['CHENNAI',   'KOLKATA',   'CHENNAI-KOLKATA',       1800, 3200, 3900],
    ['CHENNAI',   'BANGALORE', 'CHENNAI-BANGALORE',      180,  350,  450],
    ['CHENNAI',   'HYDERABAD', 'CHENNAI-HYDERABAD',      500,  900, 1200],
    ['CHENNAI',   'KOCHI',     'CHENNAI-KOCHI',          400,  700,  950],
    ['CHENNAI',   'COIMBATORE','CHENNAI-COIMBATORE',     200,  380,  500],
    ['CHENNAI',   'THIRUVANANTHAPURAM', 'CHENNAI-THIRUVANANTHAPURAM', 600, 1050, 1350],
    ['CHENNAI',   'VISAKHAPATNAM','CHENNAI-VISAKHAPATNAM', 850, 1500, 1850],
    // Bangalore Hub
    ['BANGALORE', 'KOLKATA',   'BANGALORE-KOLKATA',     2200, 3600, 4300],
    ['BANGALORE', 'HYDERABAD', 'BANGALORE-HYDERABAD',    450,  800, 1100],
    ['BANGALORE', 'KOCHI',     'BANGALORE-KOCHI',        350,  620,  820],
    ['BANGALORE', 'COIMBATORE','BANGALORE-COIMBATORE',   200,  370,  480],
    ['BANGALORE', 'VISAKHAPATNAM','BANGALORE-VISAKHAPATNAM', 950, 1700, 2100],
    // Kolkata Hub
    ['KOLKATA',   'PATNA',     'KOLKATA-PATNA',          350,  650,  900],
    ['KOLKATA',   'BHUBANESWAR','KOLKATA-BHUBANESWAR',   200,  400,  550],
    ['KOLKATA',   'GUWAHATI',  'KOLKATA-GUWAHATI',       800, 1400, 1800],
    ['KOLKATA',   'VARANASI',  'KOLKATA-VARANASI',       700, 1200, 1550],
    // Other Important Routes
    ['HYDERABAD', 'VISAKHAPATNAM','HYDERABAD-VISAKHAPATNAM', 450, 820, 1080],
    ['HYDERABAD', 'NAGPUR',    'HYDERABAD-NAGPUR',       450,  800, 1050],
    ['AHMEDABAD', 'BHOPAL',    'AHMEDABAD-BHOPAL',       650, 1100, 1400],
    ['PATNA',     'VARANASI',  'PATNA-VARANASI',         200,  370,  480],
    ['LUCKNOW',   'PATNA',     'LUCKNOW-PATNA',          350,  620,  820],
    ['JAIPUR',    'AHMEDABAD', 'JAIPUR-AHMEDABAD',       400,  700,  920],
    ['KOCHI',     'THIRUVANANTHAPURAM','KOCHI-THIRUVANANTHAPURAM', 100, 200, 270],
];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('Getting SUPER_ADMIN token...');
    const { token } = await httpsGet('https://rail-planner-api.onrender.com/api/auth/dev-bypass-token/SUPER_ADMIN');
    console.log('✅ Token obtained!\n');

    // Build full list: original + vice versa
    const allCorridors = [];
    for (const [origKey, destKey, name, sl, a3, a2] of ROUTES) {
        allCorridors.push({ name, origKey, destKey, sl, a3, a2 });
        // Vice versa — same prices for reverse direction
        allCorridors.push({
            name: name.split('-').reverse().join('-'),
            origKey: destKey,
            destKey: origKey,
            sl, a3, a2
        });
    }

    console.log(`Adding ${allCorridors.length} corridors (${ROUTES.length} routes × 2 for vice versa)...\n`);
    let added = 0, skipped = 0, failed = 0;

    for (const c of allCorridors) {
        const body = {
            name: c.name,
            originStations: JSON.stringify(STATIONS[c.origKey]),
            destinationStations: JSON.stringify(STATIONS[c.destKey]),
            markupSL: c.sl,
            markup3A: c.a3,
            markup2A: c.a2
        };

        const result = await httpsPost('https://rail-planner-api.onrender.com/api/corridors', body, token);

        if (result.status === 200 && result.body.success) {
            console.log(`✅ ${c.name}`);
            added++;
        } else if (result.body?.error?.includes('already exists')) {
            console.log(`⏭  ${c.name} [already exists, skipped]`);
            skipped++;
        } else {
            console.error(`❌ ${c.name}: ${result.status} - ${JSON.stringify(result.body)}`);
            failed++;
        }
        await sleep(150); // Slight delay to avoid rate-limiting
    }

    console.log(`\n════════════════════════`);
    console.log(`✅ Added:   ${added}`);
    console.log(`⏭  Skipped: ${skipped}`);
    console.log(`❌ Failed:  ${failed}`);
    console.log(`════════════════════════`);
    console.log('Done! Refresh the Corridor Pricing page to see all routes.');
}

main().catch(console.error);
