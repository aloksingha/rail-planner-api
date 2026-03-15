import { prisma } from './prisma';

// ─── Station Codes ────────────────────────────────────────────────────────────
const S: Record<string, string[]> = {
    DELHI:     ['NDLS','DLI','NZM','DEE','DEC','ANVT'],
    MUMBAI:    ['MMCT','CSMT','BDTS','PNVL','DR','LTT'],
    CHENNAI:   ['MAS','MS','MSB','AJJ','PER'],
    BANGALORE: ['SBC','BNC','YPR','BYPL','KJM'],
    KOLKATA:   ['HWH','KOAA','SDAH','BDC','KGP'],
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
};

// ─── Routes: [from, to, name, sl, 3a, 2a] ─────────────────────────────────────
const ROUTES: [string, string, string, number, number, number][] = [
    ['DELHI','MUMBAI','DELHI-MUMBAI',2500,4000,4700],
    ['DELHI','CHENNAI','DELHI-CHENNAI',2800,4500,5200],
    ['DELHI','BANGALORE','DELHI-BANGALORE',3000,4800,5600],
    ['DELHI','KOLKATA','DELHI-KOLKATA',1800,3000,3600],
    ['DELHI','HYDERABAD','DELHI-HYDERABAD',2200,3500,4200],
    ['DELHI','GUWAHATI','DELHI-GUWAHATI',1500,2500,3000],
    ['DELHI','PATNA','DELHI-PATNA',900,1600,2100],
    ['DELHI','LUCKNOW','DELHI-LUCKNOW',500,900,1200],
    ['DELHI','JAIPUR','DELHI-JAIPUR',300,600,800],
    ['DELHI','AMRITSAR','DELHI-AMRITSAR',400,750,1000],
    ['DELHI','BHUBANESWAR','DELHI-BHUBANESWAR',2000,3200,3800],
    ['DELHI','AHMEDABAD','DELHI-AHMEDABAD',900,1500,1900],
    ['DELHI','PUNE','DELHI-PUNE',1600,2600,3200],
    ['DELHI','BHOPAL','DELHI-BHOPAL',700,1200,1600],
    ['DELHI','NAGPUR','DELHI-NAGPUR',1300,2100,2600],
    ['DELHI','CHANDIGARH','DELHI-CHANDIGARH',250,450,600],
    ['DELHI','AGRA','DELHI-AGRA',180,320,420],
    ['DELHI','VARANASI','DELHI-VARANASI',650,1100,1450],
    ['DELHI','VISAKHAPATNAM','DELHI-VISAKHAPATNAM',2300,3700,4400],
    ['DELHI','JAMMU','DELHI-JAMMU',650,1100,1450],
    ['DELHI','LUDHIANA','DELHI-LUDHIANA',350,620,820],
    ['DELHI','PATHANKOT','DELHI-PATHANKOT',500,880,1150],
    ['DELHI','AMBALA','DELHI-AMBALA',200,370,490],
    ['DELHI','SHIMLA','DELHI-SHIMLA',280,500,660],
    ['DELHI','DEHRADUN','DELHI-DEHRADUN',300,550,720],
    ['MUMBAI','CHENNAI','MUMBAI-CHENNAI',1100,2000,2400],
    ['MUMBAI','BANGALORE','MUMBAI-BANGALORE',800,1400,1800],
    ['MUMBAI','KOLKATA','MUMBAI-KOLKATA',2000,3200,3900],
    ['MUMBAI','HYDERABAD','MUMBAI-HYDERABAD',700,1200,1600],
    ['MUMBAI','PUNE','MUMBAI-PUNE',150,300,400],
    ['MUMBAI','AHMEDABAD','MUMBAI-AHMEDABAD',280,500,650],
    ['MUMBAI','GUWAHATI','MUMBAI-GUWAHATI',2500,4000,4800],
    ['MUMBAI','BHUBANESWAR','MUMBAI-BHUBANESWAR',1600,2700,3200],
    ['MUMBAI','NAGPUR','MUMBAI-NAGPUR',600,1100,1400],
    ['MUMBAI','PATNA','MUMBAI-PATNA',1700,2800,3400],
    ['CHENNAI','KOLKATA','CHENNAI-KOLKATA',1800,3200,3900],
    ['CHENNAI','BANGALORE','CHENNAI-BANGALORE',180,350,450],
    ['CHENNAI','HYDERABAD','CHENNAI-HYDERABAD',500,900,1200],
    ['CHENNAI','KOCHI','CHENNAI-KOCHI',400,700,950],
    ['CHENNAI','COIMBATORE','CHENNAI-COIMBATORE',200,380,500],
    ['CHENNAI','THIRUVANANTHAPURAM','CHENNAI-THIRUVANANTHAPURAM',600,1050,1350],
    ['CHENNAI','VISAKHAPATNAM','CHENNAI-VISAKHAPATNAM',850,1500,1850],
    ['CHENNAI','GUWAHATI','CHENNAI-GUWAHATI',2800,4500,5200],
    ['BANGALORE','KOLKATA','BANGALORE-KOLKATA',2200,3600,4300],
    ['BANGALORE','HYDERABAD','BANGALORE-HYDERABAD',450,800,1100],
    ['BANGALORE','KOCHI','BANGALORE-KOCHI',350,620,820],
    ['BANGALORE','COIMBATORE','BANGALORE-COIMBATORE',200,370,480],
    ['BANGALORE','VISAKHAPATNAM','BANGALORE-VISAKHAPATNAM',950,1700,2100],
    ['BANGALORE','GUWAHATI','BANGALORE-GUWAHATI',3000,4800,5600],
    ['KOLKATA','PATNA','KOLKATA-PATNA',350,650,900],
    ['KOLKATA','BHUBANESWAR','KOLKATA-BHUBANESWAR',200,400,550],
    ['KOLKATA','GUWAHATI','KOLKATA-GUWAHATI',800,1400,1800],
    ['KOLKATA','VARANASI','KOLKATA-VARANASI',700,1200,1550],
    ['HYDERABAD','VISAKHAPATNAM','HYDERABAD-VISAKHAPATNAM',450,820,1080],
    ['HYDERABAD','NAGPUR','HYDERABAD-NAGPUR',450,800,1050],
    ['HYDERABAD','GUWAHATI','HYDERABAD-GUWAHATI',2500,4000,4700],
    ['AHMEDABAD','BHOPAL','AHMEDABAD-BHOPAL',650,1100,1400],
    ['PATNA','VARANASI','PATNA-VARANASI',200,370,480],
    ['LUCKNOW','PATNA','LUCKNOW-PATNA',350,620,820],
    ['JAIPUR','AHMEDABAD','JAIPUR-AHMEDABAD',400,700,920],
    ['KOCHI','THIRUVANANTHAPURAM','KOCHI-THIRUVANANTHAPURAM',100,200,270],
    ['AMRITSAR','JAMMU','AMRITSAR-JAMMU',200,370,490],
    ['AMRITSAR','CHANDIGARH','AMRITSAR-CHANDIGARH',150,280,370],
    ['CHANDIGARH','JAMMU','CHANDIGARH-JAMMU',250,460,600],
    ['LUDHIANA','AMRITSAR','LUDHIANA-AMRITSAR',80,160,210],
    ['LUDHIANA','JAMMU','LUDHIANA-JAMMU',250,450,590],
    ['PATHANKOT','JAMMU','PATHANKOT-JAMMU',90,180,240],
    ['GUWAHATI','KOCHI','GUWAHATI-KOCHI',3200,5100,5900],
    ['GUWAHATI','THIRUVANANTHAPURAM','GUWAHATI-THIRUVANANTHAPURAM',3400,5400,6200],
    ['GUWAHATI','COIMBATORE','GUWAHATI-COIMBATORE',3000,4800,5600],
    ['GUWAHATI','VISAKHAPATNAM','GUWAHATI-VISAKHAPATNAM',2000,3300,3900],
    ['GUWAHATI','BHUBANESWAR','GUWAHATI-BHUBANESWAR',1500,2500,3000],
    ['AGARTALA','BANGALORE','AGARTALA-BANGALORE',3200,5100,5900],
    ['AGARTALA','HYDERABAD','AGARTALA-HYDERABAD',2700,4300,5000],
    ['AGARTALA','CHENNAI','AGARTALA-CHENNAI',3000,4800,5600],
    ['DIBRUGARH','BANGALORE','DIBRUGARH-BANGALORE',3400,5400,6200],
    ['DIBRUGARH','CHENNAI','DIBRUGARH-CHENNAI',3200,5100,5900],
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
export async function seedCorridorsIfEmpty() {
    try {
        const count = await prisma.corridorPricing.count();
        if (count > 0) {
            console.log(`[Seed] ${count} corridor(s) already exist. Skipping seed.`);
            return;
        }

        console.log('[Seed] No corridors found. Seeding all Indian train corridor prices...');
        const corridors = buildAllCorridors();

        let added = 0;
        for (const c of corridors) {
            try {
                await prisma.corridorPricing.create({
                    data: {
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
                if (!e.message?.includes('Unique constraint')) {
                    console.warn(`[Seed] Skipped ${c.name}: ${e.message}`);
                }
            }
        }
        console.log(`[Seed] Done! Added ${added} corridor pricing rules.`);
    } catch (err) {
        console.error('[Seed] Corridor seed error (non-fatal):', err);
    }
}
