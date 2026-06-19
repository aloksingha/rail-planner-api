/**
 * Shared utilities for train booking and class filtering.
 */

export const TRAIN_CLASS_LABELS: Record<string, string> = {
    'SL': 'Sleeper (SL)',
    '3A': 'AC 3 Tier (3A)',
    '2A': 'AC 2 Tier (2A)',
    '1A': 'AC First Class (1A)',
    'CC': 'AC Chair Car (CC)',
    '3E': 'AC 3 Economy (3E)',
    '2S': 'Second Sitting (2S)',
    'FC': 'First Class (FC)',
    'EV': 'Vistadome AC (EV)',
    'EC': 'Executive Class (EC)'
};

/**
 * Heuristic to determine if a train is AC-only based on its name.
 */
export const isACOnlyTrain = (trainName: string | undefined): boolean => {
    if (!trainName) return false;
    const upperName = trainName.toUpperCase();
    return (
        upperName.includes(' AC ') || 
        upperName.includes('AC ') || 
        upperName.endsWith(' AC') ||
        upperName.includes('RAJDHANI') ||
        upperName.includes('SHATABDI') ||
        upperName.includes('DURONTO') ||
        upperName.includes('TEJAS') ||
        upperName.includes('VANDE BHARAT')
    );
};

/**
 * Determines which classes to show for a given train.
 * Priority: 1. `available_classes` from backend. 2. Heuristic fallback.
 */
export const getClassesToShow = (
    availableClasses: string[] | undefined,
    trainName: string | undefined,
    trainNo?: string | number,
    trainType?: string
): string[] => {
    const tNo = trainNo ? String(trainNo).trim() : '';
    const tName = trainName ? String(trainName).toUpperCase() : '';
    const tType = trainType ? String(trainType).toUpperCase() : '';

    // If it's a Passenger train, it only has Second Sitting (2S)
    if (tType === 'PASSENGER' || tType.includes('PASS') || tName.includes('PASSENGER') || tName.includes('PASSGR')) {
        return ['2S'];
    }

    // If it's a Humsafar Express, it only has AC 3 Tier (3A)
    if (tName.includes('HUMSAFAR')) {
        return ['3A'];
    }

    // Hardcoded override for Kulik Express (13053 / 13054)
    if (tNo === '13053' || tNo === '13054' || tName.includes('KULIK')) {
        return ['CC', '2S', '3E', 'EV'];
    }

    const avCls = availableClasses || [];
    
    if (avCls.length > 0) {
        // Return filtered list of supported classes that are available
        return ['SL', '3A', '2A', 'CC', '3E', '1A', '2S', 'FC', 'EV', 'EC'].filter(c => avCls.includes(c));
    }

    // Fallback heuristic if available_classes is missing.
    // CC (Chair Car) is NOT included in default fallback — most Mail/Express/SF trains
    // don't have Chair Car coaches. CC only shows when API returns it in available_classes,
    // OR for day-train types (Intercity / Jan Shatabdi / Chair Car specials).
    const isChairCarTrain = tName.includes('INTERCITY') || tName.includes('JAN SHATABDI') || 
                             tName.includes('CHAIR') || tType.includes('INTERCITY');
    const isAC = isACOnlyTrain(trainName);

    if (isChairCarTrain) {
        return ['SL', '3A', '2A', 'CC'];
    }
    return isAC 
        ? ['3A', '2A', '1A'] 
        : ['SL', '3A', '2A'];
};

/**
 * Helper to extract station code from "Name [CODE]" format or resolve known names.
 */
export const resolveToCode = (str: string): string => {
    if (!str) return '';
    
    // 1. Check for [CODE] format (e.g., "New Delhi [NDLS]")
    const match = str.match(/\[([A-Z0-9]+)\]/i);
    if (match) return match[1].toUpperCase().trim();
    
    // 2. Clean common suffixes
    const raw = str.trim().toUpperCase();
    const rawClean = raw.replace(/\s+JN$/i, '').replace(/\s+JUNCTION$/i, '').replace(/\s+STATION$/i, '').trim();

    const NAME_TO_CODE: Record<string, string> = {
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
    
    return NAME_TO_CODE[rawClean] || NAME_TO_CODE[raw] || rawClean;
};

/**
 * Centralized pricing engine.
 * Accepts all external data dependencies as arguments to remain pure and testable.
 */
export const getTicketPrice = (
    srcRaw: string, 
    dstRaw: string, 
    clsRaw: string, 
    tName?: string, 
    tTravelTime?: string, 
    trainPrices?: Record<string, number>,
    customPrices: any[] = [],
    dynamicCorridors: any[] = []
): number => {
    // Normalize Class
    const cls = String(clsRaw || '').toUpperCase().trim();
    const src = resolveToCode(srcRaw);
    const dst = resolveToCode(dstRaw);

    // 0. Hardcoded Priority Corridor Overrides (Immediate Impact)
    const isHWHPUNE = (src === 'HWH' && dst === 'PUNE') || (src === 'PUNE' && dst === 'HWH');
    if (isHWHPUNE) {
        if (cls === 'SL') return 2600;
        if (cls === '3A' || cls === '3E' || cls === 'CC') return 4200;
        if (cls === '2A') return 5400;
    }

    // 1. Check for Admin-defined custom prices FIRST (Critical Priority)
    const customPrice = customPrices.find(p => {
        const pSource = resolveToCode(p.source);
        const pDest = resolveToCode(p.destination);
        
        const matches = pSource === src &&
            pDest === dst &&
            String(p.class).toUpperCase() === cls &&
            (tName ? String(p.trainName).toUpperCase() === String(tName).toUpperCase() : true);

        if (!matches) return false;

        const updatedAt = new Date(p.updatedAt);
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        return updatedAt >= threeHoursAgo;
    });

    if (customPrice && customPrice.suggestedPrice) {
        return customPrice.suggestedPrice;
    }

    // 2. PREMIUM TRAIN CHECK (Price on Request) - Only if no custom price exists
    const isPremiumTrain = tName ? /(satabdi|shatabdi|rajdhani|vande\s*bharat|duronto|amrit\s*bharat|tejas|gatiman)/i.test(tName) : false;
    if (isPremiumTrain) {
        return 0;
    }

    // 3. BACKEND per-train price (IRCTC API) - runs BEFORE corridor so each train shows its own price
    if (trainPrices) {
        let p = 0;
        if (cls === '3A' || cls === '3E' || cls === 'CC') {
            p = trainPrices['3A'] || trainPrices['3E'] || trainPrices['CC'] || 0;
        } else if (cls === '2A' || cls === '1A' || cls === 'FC') {
            p = trainPrices['2A'] || trainPrices['1A'] || trainPrices['FC'] || 0;
        } else {
            p = trainPrices[cls] || 0;
        }
        if (p > 0) return p;
    }

    let baseResult = 0;

    // 4. Dynamic Corridor Logic
    for (const corridor of dynamicCorridors) {
        try {
            let origins: string[] = [];
            let dests: string[] = [];
            
            try {
                origins = JSON.parse(corridor.originStations);
            } catch {
                origins = String(corridor.originStations || '').replace(/[\[\]'"]/g, '').split(',').map((s: string) => s.trim());
            }
            
            try {
                dests = JSON.parse(corridor.destinationStations);
            } catch {
                dests = String(corridor.destinationStations || '').replace(/[\[\]'"]/g, '').split(',').map((s: string) => s.trim());
            }

            const srcCode = resolveToCode(srcRaw);
            const dstCode = resolveToCode(dstRaw);
            
            const originsCodes = origins.map(s => resolveToCode(s));
            const destsCodes = dests.map(s => resolveToCode(s));

            const matchForward = originsCodes.includes(srcCode) && destsCodes.includes(dstCode);
            const matchReverse = originsCodes.includes(dstCode) && destsCodes.includes(srcCode);

            if (matchForward || matchReverse) {
                if (cls === 'SL' && corridor.markupSL > 0) {
                    baseResult = corridor.markupSL;
                    break;
                }
                if (cls === '2S' && corridor.markupSL > 0) {
                    baseResult = Math.round(corridor.markupSL * 0.6);
                    break;
                }
                if ((cls === '3A' || cls === '3E' || cls === 'CC') && corridor.markup3A > 0) {
                    baseResult = corridor.markup3A;
                    break;
                }
                if ((cls === '2A' || cls === 'FC') && corridor.markup2A > 0) {
                    baseResult = corridor.markup2A;
                    break;
                }
                if (cls === '1A' && corridor.markup2A > 0) {
                    baseResult = Math.round(corridor.markup2A * 1.35);
                    break;
                }
                if (cls === 'EC' && corridor.markup3A > 0) {
                    baseResult = Math.round(corridor.markup3A * 2.4);
                    break;
                }
                if (cls === 'EV' && corridor.markup3A > 0) {
                    baseResult = Math.round(corridor.markup3A * 2.65);
                    break;
                }
            }
        } catch (e) {
            console.error('Corridor matching error', e);
        }
    }

    // 5. Fallback pricing if no other source matched
    if (baseResult === 0) {
        let totalHours = 8;
        if (tTravelTime) {
            const parts = tTravelTime.split(':');
            if (parts.length >= 2) {
                totalHours = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
            }
        }
        totalHours = Math.max(2, totalHours);

        const baseSL = 150 + (35 * totalHours);
        const base3A = 300 + (80 * totalHours);
        const base2A = 450 + (125 * totalHours);

        if (cls === 'SL') baseResult = baseSL + 200 + 1200; // Total Fixed: 1400
        else if (cls === '3A' || cls === '3E' || cls === 'CC') baseResult = base3A + 400 + 1000; // Total Fixed: 1400
        else if (cls === '2A' || cls === 'FC') baseResult = base2A + 500 + 800; // Total Fixed: 1300
        else if (cls === '2S') baseResult = Math.round((baseSL + 1400) * 0.6);
        else if (cls === '1A') baseResult = Math.round((base2A + 1300) * 1.35);
        else if (cls === 'EC') baseResult = Math.round((base3A + 1400) * 2.4);
        else if (cls === 'EV') baseResult = Math.round((base3A + 1400) * 2.65);
        else baseResult = baseSL + 1400;
    }

    // 6. APPLY DIFFERENTIATION
    const isSuperfast = tName ? /(superfast|sf|mail|express\s*sf|duronto|rajdhani|tejas)/i.test(tName) : false;
    const sfCharge = isSuperfast ? (cls === 'SL' ? 45 : (cls === '2S' ? 15 : 60)) : 0;
    const trainVariation = tName ? (tName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10) * 5 : 0;

    return Math.round(baseResult + sfCharge + trainVariation);
};
