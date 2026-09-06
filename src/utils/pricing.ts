
import { PricingRule, SpecialCharge, StationMapping, StationNearby } from '@prisma/client';

export interface PricingContext {
    corridors: any[];
    customPrices: any[];
    rules: PricingRule[];
    specialCharges: SpecialCharge[];
    mappings: StationMapping[];
    nearbys: StationNearby[];
}

export const extractCode = (str: string) => {
    if (!str) return '';
    const match = str.match(/\[([A-Z0-9]+)\]/i);
    if (match) return match[1].toUpperCase().trim();
    return str.trim().toUpperCase();
};

const resolveToCode = (str: string, mappings: StationMapping[] = []) => {
    const raw = extractCode(str);
    if (!raw) return '';
    if (raw.length <= 4 && /^[A-Z0-9]+$/.test(raw)) return raw;
    
    const mapping = mappings.find(m => m.name.toUpperCase() === raw.toUpperCase() || m.code === raw);
    if (mapping) return mapping.code;

    const rawClean = raw.replace(/\s+JN$/i, '').replace(/\s+JUNCTION$/i, '').replace(/\s+STATION$/i, '').trim();
    const fallback: Record<string, string> = {
        'SECUNDERABAD': 'SC',
        'HYDERABAD': 'SC',
        'NEW JALPAIGURI': 'NJP',
        'AGARTALA': 'AGT',
        'DELHI': 'NDLS',
        'NEW DELHI': 'NDLS',
        'DLI': 'NDLS',
        'NZM': 'NDLS',
        'DEC': 'NDLS',
        'DEE': 'NDLS',
        'ANVT': 'NDLS',
        'MUMBAI': 'CSMT',
        'BANGALORE': 'SBC',
        'BENGALURU': 'SBC',
        'SMVT BENGALURU': 'SMVB',
        'KOLKATA': 'HWH',
        'HOWRAH': 'HWH',
        'GUWAHATI': 'GHY',
        'PATNA': 'PNBE',
        'DHANBAD': 'DHN',
        'RANCHI': 'RNC',
        'AHMEDABAD': 'ADI',
        'SBIB': 'ADI',
        'PUNE': 'PUNE',
        'SBT': 'ADI',
        'KOCHI': 'ERS',
        'ERNAKULAM': 'ERS',
        'TRIVANDRUM': 'TVC',
        'THIRUVANANTHAPURAM': 'TVC'
    };
    
    return fallback[rawClean] || fallback[raw] || rawClean;
};

export const getTicketPrice = (
    srcRaw: string, 
    dstRaw: string, 
    clsRaw: string, 
    tName?: string, 
    tTravelTime?: string,
    context?: PricingContext
) => {
    if (!context) {
        console.warn('[Pricing] Called without context. Returning fallback 0.');
        return 0;
    }

    const { corridors, customPrices, rules, specialCharges, mappings } = context;
    const cls = String(clsRaw || '').toUpperCase().trim();
    const src = resolveToCode(srcRaw, mappings);
    const dst = resolveToCode(dstRaw, mappings);
    const logPrefix = `[Pricing:${src}->${dst}:${cls}]`;
    
    // 0. Hardcoded Priority Corridor Overrides (Immediate Impact - Parity with Frontend)
    const isHWHPUNE = (src === 'HWH' && dst === 'PUNE') || (src === 'PUNE' && dst === 'HWH');
    if (isHWHPUNE) {
        console.log(`${logPrefix} Matching Hardcoded HWH-PUNE Corridor`);
        if (cls === 'SL') return 2600;
        if (cls === '3A' || cls === '3E' || cls === 'CC') return 4200;
        if (cls === '2A') return 5400;
    }

    // 1. Check for Custom Price Overrides
    const custom = customPrices.find(p => 
        extractCode(p.source) === src && 
        extractCode(p.destination) === dst && 
        p.class === cls
    );
    if (custom && custom.suggestedPrice) {
        console.log(`${logPrefix} Match Success: Custom Price ₹${custom.suggestedPrice}`);
        return Math.round(custom.suggestedPrice);
    }

    // 1.5. Premium Train Check
    const isPremiumTrain = tName ? /(satabdi|shatabdi|rajdhani|vande\s*bharat|duronto|amrit\s*bharat|tejas|gatiman)/i.test(tName) : false;
    if (isPremiumTrain) return 0;

    let baseResult = 0;
    let matchType = 'NONE';

    // 2. Dynamic Corridor Logic
    for (const corridor of corridors) {
        try {
            const origins = JSON.parse(corridor.originStations || '[]').map((s: any) => resolveToCode(String(s), mappings));
            const destinations = JSON.parse(corridor.destinationStations || '[]').map((s: any) => resolveToCode(String(s), mappings));
            
            const matchForward = origins.includes(src) && destinations.includes(dst);
            const matchReverse = origins.includes(dst) && destinations.includes(src);

            if (matchForward || matchReverse) {
                if (cls === 'SL' && corridor.markupSL > 0) {
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (SL: ₹${corridor.markupSL})`);
                    baseResult = corridor.markupSL;
                    matchType = 'CORRIDOR';
                    break;
                }
                if (cls === '2S' && corridor.markupSL > 0) {
                    baseResult = Math.round(corridor.markupSL * 0.6);
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (2S: ₹${baseResult})`);
                    matchType = 'CORRIDOR';
                    break;
                }
                if ((cls === '3A' || cls === '3E' || cls === 'CC') && corridor.markup3A > 0) {
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (3A/3E/CC: ₹${corridor.markup3A})`);
                    baseResult = corridor.markup3A;
                    matchType = 'CORRIDOR';
                    break;
                }
                if ((cls === '2A' || cls === 'FC') && corridor.markup2A > 0) {
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (2A/FC: ₹${corridor.markup2A})`);
                    baseResult = corridor.markup2A;
                    matchType = 'CORRIDOR';
                    break;
                }
                if (cls === '1A' && corridor.markup2A > 0) {
                    baseResult = Math.round(corridor.markup2A * 1.6);
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (1A: ₹${baseResult})`);
                    matchType = 'CORRIDOR';
                    break;
                }
                if (cls === 'EC' && corridor.markup3A > 0) {
                    baseResult = Math.round(corridor.markup3A * 2.4);
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (EC: ₹${baseResult})`);
                    matchType = 'CORRIDOR';
                    break;
                }
                if (cls === 'EV' && corridor.markup3A > 0) {
                    baseResult = Math.round(corridor.markup3A * 2.65);
                    console.log(`${logPrefix} Match Success: Dynamic Corridor ${corridor.name} (EV: ₹${baseResult})`);
                    matchType = 'CORRIDOR';
                    break;
                }
            }
        } catch (e) {
            console.error('[Pricing] Corridor error', e);
        }
    }

    // 3. Fallback Formula Logic
    if (baseResult === 0) {
        // First try DB Rules
        
        let totalHours = 8;
        if (tTravelTime) {
            const parts = tTravelTime.split(':');
            if (parts.length >= 2) {
                totalHours = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
            }
        }
        totalHours = Math.max(2, totalHours);

        // Hardcoded Fallback Parity (Same as Frontend)
        const baseSL = 150 + (35 * totalHours);
        const base3A = 300 + (80 * totalHours);
        const base2A = 450 + (125 * totalHours);

        if (cls === 'SL') baseResult = baseSL + 200 + 1200; // Tatkal: 200, Margin: 1200 (Total: 1400)
        else if (cls === '3A' || cls === '3E' || cls === 'CC') baseResult = base3A + 400 + 1000; // Tatkal: 400, Margin: 1000 (Total: 1400)
        else if (cls === '2A' || cls === 'FC') baseResult = base2A + 500 + 800; // Tatkal: 500, Margin: 800 (Total: 1300)
        else if (cls === '2S') baseResult = Math.round((baseSL + 1400) * 0.6);
        else if (cls === '1A') baseResult = Math.round((base2A + 1300) * 1.6);
        else if (cls === 'EC') baseResult = Math.round((base3A + 1400) * 2.4);
        else if (cls === 'EV') baseResult = Math.round((base3A + 1400) * 2.65);
        else baseResult = baseSL + 1400;

        console.log(`${logPrefix} Match Success: Hardcoded Fallback (H:${totalHours.toFixed(1)}) Result: ₹${baseResult}`);
        matchType = 'HARD_FALLBACK';
    }

    // 4. Special Charges (Superfast etc.)
    const activeCharges = specialCharges.filter(sc => tName && new RegExp(sc.pattern, 'i').test(tName));
    let extraCharge = 0;
    for (const sc of activeCharges) {
        if (cls === 'SL') extraCharge += sc.amountSL;
        else if (cls === '3A' || cls === '3E' || cls === 'CC') extraCharge += sc.amount3A;
        else if (cls === '2S') extraCharge += sc.amount2S;
        else if (cls === '2A' || cls === 'FC') extraCharge += sc.amount2A;
        else if (cls === '1A' || cls === 'EC' || cls === 'EV') extraCharge += sc.amount2A;
    }

    const trainVariation = tName ? (tName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10) * 5 : 0;
    const finalPrice = Math.round(baseResult + extraCharge + trainVariation);
    
    return finalPrice;
};
