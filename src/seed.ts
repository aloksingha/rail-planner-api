import { prisma } from './prisma';

// ─── Station Codes ────────────────────────────────────────────────────────────
const S: Record<string, string[]> = {
    DELHI:     ['NDLS','DLI','NZM','DEE','DEC','ANVT'],
    MUMBAI:    ['MMCT','CSMT','BDTS','PNVL','DR','LTT'],
    CHENNAI:   ['MAS','MS','MSB','AJJ','PER'],
    BANGALORE: ['SBC','BNC','YPR','BYPL','KJM','SMVB'],
    KOLKATA:   ['HWH','KOAA','SDAH','BDC','KGP','SHM'],
    NORTH_BENGAL: ['MLDT','NFK','RPH','BOE','KNE','AUB','RGJ','NJP','SGUJ','RDP','KIR','SM'],
    HYDERABAD: ['HYB','SC','KI','NED','BMO'],
    PATNA:     ['PNBE','DNR','PAT','RJPB','BKP'],
    LUCKNOW:   ['LKO','LJN','BMK','ASH'],
    JAIPUR:    ['JP','JPF','SOJT'],
    AMRITSAR:  ['ASR','ASR1'],
    PUNE:      ['PUNE','GC','DND','LNL'],
    AHMEDABAD: ['ADI','ST','BRC','VDR'],
    BHOPAL:    ['BPL','HBJ','ET'],
    NAGPUR:    ['NGP','NGPK','BSL'],
    GUWAHATI:  ['GHY','KYQ','APDJ'],
    AGARTALA:  ['AGTL','UAGC'],
    DIBRUGARH: ['DBRG','DBRT'],
    BHUBANESWAR: ['BBS','BBSR','CTC','BRCB'],
    CHANDIGARH: ['CDG','SRE','SSP'],
    KOCHI:     ['ERS','ERN','KCVL','AWY'],
    THIRUVANANTHAPURAM: ['TVC','TVP'],
    VARANASI:  ['BSB','MGS','DDU'],
    AGRA:      ['AGC','AF','AGCW'],
    COIMBATORE: ['CBE','COBE'],
    VISAKHAPATNAM: ['VSKP','VZM'],
    JAMMU:     ['JAT','SVDK','JMM'],
    LUDHIANA:  ['LDH','LDHI'],
    PATHANKOT: ['PTK','PTKC'],
    AMBALA:    ['UMB'],
    SHIMLA:    ['SML'],
    DEHRADUN:  ['DDN'],
    GOA:       ['VSG','MAO','KRMI','THVM'],
    RANCHI:    ['RNC','HTE'],
};

// ─── Routes: [from, to, name, sl, 3a, 2a] — Long Distance Only (600km+) ──────
const ROUTES: [string, string, string, number, number, number][] = [
    // Delhi Hub — Long Distance
    ['DELHI','MUMBAI','DELHI-MUMBAI',2500,4000,4700],
    ['DELHI','CHENNAI','DELHI-CHENNAI',2800,4500,5200],
    ['DELHI','BANGALORE','DELHI-BANGALORE',3000,4800,5600],
    ['DELHI','KOLKATA','DELHI-KOLKATA',1800,3000,3600],
    ['DELHI','HYDERABAD','DELHI-HYDERABAD',2200,3500,4200],
    ['DELHI','GUWAHATI','DELHI-GUWAHATI',1500,2500,3000],
    ['DELHI','PATNA','DELHI-PATNA',900,1600,2100],
    ['DELHI','LUCKNOW','DELHI-LUCKNOW',500,900,1200],
    ['DELHI','BHUBANESWAR','DELHI-BHUBANESWAR',2000,3200,3800],
    ['DELHI','AHMEDABAD','DELHI-AHMEDABAD',900,1500,1900],
    ['DELHI','PUNE','DELHI-PUNE',1600,2600,3200],
    ['DELHI','BHOPAL','DELHI-BHOPAL',700,1200,1600],
    ['DELHI','NAGPUR','DELHI-NAGPUR',1300,2100,2600],
    ['DELHI','VARANASI','DELHI-VARANASI',650,1100,1450],
    ['DELHI','VISAKHAPATNAM','DELHI-VISAKHAPATNAM',2300,3700,4400],
    ['DELHI','JAMMU','DELHI-JAMMU',650,1100,1450],
    ['DELHI','LUDHIANA','DELHI-LUDHIANA',350,620,820],
    ['DELHI','PATHANKOT','DELHI-PATHANKOT',500,880,1150],
    // Mumbai Hub — Long Distance
    ['MUMBAI','CHENNAI','MUMBAI-CHENNAI',1100,2000,2400],
    ['MUMBAI','BANGALORE','MUMBAI-BANGALORE',800,1400,1800],
    ['MUMBAI','KOLKATA','MUMBAI-KOLKATA',2000,3200,3900],
    ['MUMBAI','HYDERABAD','MUMBAI-HYDERABAD',700,1200,1600],
    ['MUMBAI','AHMEDABAD','MUMBAI-AHMEDABAD',600,1050,1350],
    ['MUMBAI','GUWAHATI','MUMBAI-GUWAHATI',2500,4000,4800],
    ['MUMBAI','BHUBANESWAR','MUMBAI-BHUBANESWAR',1600,2700,3200],
    ['MUMBAI','NAGPUR','MUMBAI-NAGPUR',600,1100,1400],
    ['MUMBAI','PATNA','MUMBAI-PATNA',1700,2800,3400],
    // Chennai Hub — Long Distance
    ['CHENNAI','KOLKATA','CHENNAI-KOLKATA',1800,3200,3900],
    ['CHENNAI','HYDERABAD','CHENNAI-HYDERABAD',500,900,1200],
    ['CHENNAI','KOCHI','CHENNAI-KOCHI',600,1050,1350],
    ['CHENNAI','VISAKHAPATNAM','CHENNAI-VISAKHAPATNAM',850,1500,1850],
    ['CHENNAI','GUWAHATI','CHENNAI-GUWAHATI',2800,4500,5200],
    ['CHENNAI','THIRUVANANTHAPURAM','CHENNAI-THIRUVANANTHAPURAM',600,1050,1350],
    // Bangalore Hub — Long Distance
    ['BANGALORE','KOLKATA','BANGALORE-KOLKATA',2200,3600,4300],
    ['BANGALORE','HYDERABAD','BANGALORE-HYDERABAD',800,2000,2700],
    ['BANGALORE','VISAKHAPATNAM','BANGALORE-VISAKHAPATNAM',950,1700,2100],
    ['BANGALORE','GUWAHATI','BANGALORE-GUWAHATI',3000,4800,5600],
    ['BANGALORE','MUMBAI','BANGALORE-MUMBAI',800,1400,1800],
    ['BANGALORE','GOA','BANGALORE-GOA',800,2000,2700],
    ['BANGALORE','RANCHI','BANGALORE-RANCHI',2500,3600,4500],
    // Kolkata Hub — Long Distance
    ['KOLKATA','PATNA','KOLKATA-PATNA',600,1050,1350],
    ['KOLKATA','GUWAHATI','KOLKATA-GUWAHATI',800,1400,1800],
    ['KOLKATA','VARANASI','KOLKATA-VARANASI',700,1200,1550],
    ['KOLKATA','BHUBANESWAR','KOLKATA-BHUBANESWAR',600,1050,1350],
    // Hyderabad Hub — Long Distance
    ['HYDERABAD','VISAKHAPATNAM','HYDERABAD-VISAKHAPATNAM',700,1200,1600],
    ['HYDERABAD','NAGPUR','HYDERABAD-NAGPUR',700,1200,1600],
    ['HYDERABAD','GUWAHATI','HYDERABAD-GUWAHATI',2500,4000,4700],
    // Northeast — South (Long Distance)
    ['GUWAHATI','KOCHI','GUWAHATI-KOCHI',3200,5100,5900],
    ['GUWAHATI','THIRUVANANTHAPURAM','GUWAHATI-THIRUVANANTHAPURAM',3400,5400,6200],
    ['GUWAHATI','VISAKHAPATNAM','GUWAHATI-VISAKHAPATNAM',2000,3300,3900],
    ['GUWAHATI','BHUBANESWAR','GUWAHATI-BHUBANESWAR',1500,2500,3000],
    ['AGARTALA','MUMBAI','AGARTALA-MUMBAI',0,5000,6000],
    ['AGARTALA','BANGALORE','AGARTALA-BANGALORE',3200,5100,5900],
    ['AGARTALA','HYDERABAD','AGARTALA-HYDERABAD',2700,4300,5000],
    ['AGARTALA','CHENNAI','AGARTALA-CHENNAI',3000,4800,5600],
    ['DIBRUGARH','BANGALORE','DIBRUGARH-BANGALORE',3400,5400,6200],
    ['DIBRUGARH','CHENNAI','DIBRUGARH-CHENNAI',3200,5100,5900],
    ['DIBRUGARH','THIRUVANANTHAPURAM','DIBRUGARH-THIRUVANANTHAPURAM',3600,5800,6600],
    ['DIBRUGARH','KOLKATA','DIBRUGARH-KOLKATA',1500,2800,3400],
    ['KOLKATA','THIRUVANANTHAPURAM','KOLKATA-THIRUVANANTHAPURAM',2500,4200,4900],
    ['KOLKATA','CHENNAI','KOLKATA-CHENNAI',1800,3200,3900],
    // North Bengal Hub
    ['NORTH_BENGAL','BANGALORE','NORTH_BENGAL-BANGALORE',2200,3600,4300],
    ['NORTH_BENGAL','CHENNAI','NORTH_BENGAL-CHENNAI',3000,4500,5500],
    ['NORTH_BENGAL','THIRUVANANTHAPURAM','NORTH_BENGAL-THIRUVANANTHAPURAM',2500,4200,4900],
    ['NORTH_BENGAL','DELHI','NORTH_BENGAL-DELHI',1200,2200,2800],
    ['NORTH_BENGAL','KOLKATA','NORTH_BENGAL-KOLKATA',600,1050,1350],
    ['NORTH_BENGAL','GUWAHATI','NORTH_BENGAL-GUWAHATI',500,850,1100],
    ['NORTH_BENGAL','AHMEDABAD','NORTH_BENGAL-AHMEDABAD',3000,4000,4700],
    // Others — Long Distance
    ['AHMEDABAD','BHOPAL','AHMEDABAD-BHOPAL',650,1100,1400],
    ['LUCKNOW','PATNA','LUCKNOW-PATNA',600,1050,1350],
    ['PATNA','VARANASI','PATNA-VARANASI',600,1050,1350],
];

// ─── Build full list with vice-versa ──────────────────────────────────────────
function buildAllCorridors() {
    const all: { name: string; origins: string; dests: string; sl: number; a3: number; a2: number }[] = [];
    const seen = new Set<string>();
    for (const [o, d, name, sl, a3, a2] of ROUTES) {
        const fwd = name;
        const rev = name.split('-').reverse().join('-');
        if (!seen.has(fwd) && S[o] && S[d]) {
            all.push({ name: fwd, origins: JSON.stringify(S[o]), dests: JSON.stringify(S[d]), sl, a3, a2 });
            seen.add(fwd);
        }
        if (!seen.has(rev) && S[d] && S[o]) {
            all.push({ name: rev, origins: JSON.stringify(S[d]), dests: JSON.stringify(S[o]), sl, a3, a2 });
            seen.add(rev);
        }
    }
    return all;
}

// ─── Seed Function ──────────────────────────────────────────────────────────
export async function seedCorridors() {
    try {
        console.log('[Seed] Syncing all Indian train corridor prices...');
        
        // Pre-flight connection check
        await prisma.$connect();
        console.log('[Seed] Connection established.');

        const corridors = buildAllCorridors();

        let added = 0;
        let updated = 0;
        for (const c of corridors) {
            try {
                await prisma.corridorPricing.upsert({
                    where: { name: c.name },
                    update: {
                        originStations: c.origins,
                        destinationStations: c.dests,
                        markupSL: c.sl,
                        markup3A: c.a3,
                        markup2A: c.a2,
                    },
                    create: {
                        name: c.name,
                        originStations: c.origins,
                        destinationStations: c.dests,
                        markupSL: c.sl,
                        markup3A: c.a3,
                        markup2A: c.a2,
                    }
                });
                added++;
            } catch (e: any) {
                console.warn(`[Seed] Failed ${c.name}: ${e.message}`);
            }
        }
        console.log(`[Seed] Done! Processed ${added} corridor pricing rules.`);
    } catch (err) {
        console.error('[Seed] Corridor seed error:', err);
    }
}

// Top-level execution for npm run seed
if (require.main === module) {
    seedCorridors()
        .then(() => {
            console.log('Seeding completed successfully.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Seeding failed:', err);
            process.exit(1);
        });
}
