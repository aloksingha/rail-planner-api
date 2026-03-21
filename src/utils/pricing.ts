export const NEARBY_STATIONS: Record<string, string[]> = {
    // Delhi/NCR
    'NDLS': ['DLI', 'NZM', 'GZB', 'ANVT', 'DEC', 'DEE', 'SZM', 'DSA', 'SSB'],
    'DLI': ['NDLS', 'NZM', 'GZB', 'ANVT', 'DEC', 'DEE', 'SZM', 'DSA', 'SSB'],
    'NZM': ['NDLS', 'DLI', 'GZB', 'ANVT', 'DEC', 'DEE', 'SZM', 'DSA', 'SSB'],
    'ANVT': ['NDLS', 'DLI', 'NZM', 'GZB', 'DEE', 'SZM', 'DSA'],
    
    // Kolkata
    'HWH': ['SDAH', 'KOAA', 'SHM', 'SRC', 'BDC'],
    'SDAH': ['HWH', 'KOAA', 'SHM', 'SRC', 'BDC'],
    'KOAA': ['HWH', 'SDAH', 'SHM', 'SRC', 'BDC'],
    'SHM': ['HWH', 'SDAH', 'KOAA', 'SRC'],
    
    // North Bengal
    'NJP': ['SGUJ', 'SGUT', 'SGU'],
    'SGUJ': ['NJP', 'SGUT', 'SGU'],
    
    // Mumbai
    'MMCT': ['BDTS', 'BCT', 'DDR', 'CSMT', 'LTT', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'BDTS': ['MMCT', 'BCT', 'DDR', 'CSMT', 'LTT', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'CSMT': ['LTT', 'DR', 'MMCT', 'BDTS', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'LTT': ['CSMT', 'DR', 'MMCT', 'BDTS', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'BVI': ['MMCT', 'BDTS', 'DDR', 'CSMT', 'LTT'],
    'TNA': ['LTT', 'CSMT', 'KYN', 'DR', 'PNVL'],
    'PNVL': ['LTT', 'CSMT', 'TNA', 'KYN'],
    
    // Bengaluru
    'SBC': ['YPR', 'SMVB', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    'YPR': ['SBC', 'SMVB', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    'SMVB': ['SBC', 'YPR', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    
    // Chennai
    'MAS': ['MS', 'TBM', 'PER', 'MSB', 'AJJ'],
    'MS': ['MAS', 'TBM', 'PER', 'MSB', 'AJJ'],
    'TBM': ['MAS', 'MS', 'PER', 'MSB', 'AJJ'],
    
    // Guwahati
    'GHY': ['KYQ', 'NGC'],
    'KYQ': ['GHY', 'NGC'],
    
    // Hyderabad
    'SC': ['HYB', 'KCG', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'HYB': ['SC', 'KCG', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'KCG': ['SC', 'HYB', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'CHZ': ['SC', 'HYB', 'KCG', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    
    // Pune/Surat/Ahmedabad
    'PUNE': ['SVJR', 'CCH', 'LNL', 'PMP'],
    'ST': ['UDN', 'CHM'],
    'ADI': ['SBT', 'MAN', 'GNC'],
    
    // Patna
    'PNBE': ['DNR', 'PPTA', 'RJPB', 'PNC'],
    'DNR': ['PNBE', 'PPTA', 'RJPB', 'PNC'],
    'PPTA': ['PNBE', 'DNR', 'RJPB', 'PNC'],
    
    // Lucknow
    'LKO': ['LJN', 'ASH', 'GTNR', 'BNZ'],
    'LJN': ['LKO', 'ASH', 'GTNR', 'BNZ'],
    
    // Varanasi / Prayagraj
    'BSB': ['DDU', 'BSBS', 'MUV', 'BCY'],
    'DDU': ['BSB', 'BSBS', 'MUV', 'BCY'],
    'PRYJ': ['PRG', 'NYN', 'SFG', 'BPL'],
    
    // Bhubaneswar
    'BBS': ['KUR', 'CTC', 'BBSN'],
    
    // Kanpur / Agra
    'CNB': ['CPA', 'GOY'],
    'AGC': ['AF', 'IDH', 'AH'],
    
    // Jharkhand
    'DHN': ['GMO', 'BKSC', 'CRP', 'ASN'],
    'HTE': ['RNC', 'MURI'],
    'RNC': ['HTE', 'MURI'],
    
    // Central hubs
    'BPL': ['HBJ', 'RKMP', 'ET'],
    'RKMP': ['BPL', 'HBJ', 'ET'],
    'NGP': ['NGPK', 'ITR', 'WR'],
    'JBP': ['MML'],
    
    // Kochi / Trivandrum
    'ERS': ['ERN', 'AWY', 'IPL'],
    'ERN': ['ERS', 'AWY', 'IPL'],
    'TVC': ['KCVL', 'TVP'],
};

export const extractCode = (str: string) => {
    if (!str) return '';
    const match = str.match(/\[([A-Z0-9]+)\]/i);
    if (match) return match[1].toUpperCase().trim();
    return str.trim().toUpperCase();
};

const resolveToCode = (str: string) => {
    const raw = extractCode(str);
    // If it's already a short code (<= 4 chars), return it
    if (raw.length <= 4) return raw;
    
    // Otherwise, check if it's a known name in NEARBY_STATIONS
    for (const [code, alts] of Object.entries(NEARBY_STATIONS)) {
        // Simple name matching (e.g. SECUNDERABAD matches SC if SC is a key and we find a match)
        // But for now, let's just use a hardcoded map for major cities or check the keys
        if (code === raw) return code;
    }

    // Special case common names / variants
    const rawClean = raw.replace(/\s+JN$/i, '').replace(/\s+JUNCTION$/i, '').trim();

    const NAME_TO_CODE: Record<string, string> = {
        'SECUNDERABAD': 'SC',
        'HYDERABAD': 'SC',
        'NEW JALPAIGURI': 'NJP',
        'AGARTALA': 'AGT',
        'DELHI': 'NDLS',
        'NEW DELHI': 'NDLS',
        'MUMBAI': 'CSMT',
        'BANGALORE': 'SBC',
        'BENGALURU': 'SBC',
        'KOLKATA': 'HWH',
        'HOWRAH': 'HWH',
        'GUWAHATI': 'GHY',
        'PATNA': 'PNBE'
    };
    
    return NAME_TO_CODE[rawClean] || NAME_TO_CODE[raw] || raw;
};

export const getTicketPrice = (
    srcRaw: string, 
    dstRaw: string, 
    clsRaw: string, 
    tName?: string, 
    tTravelTime?: string,
    corridors: any[] = [],
    customPrices: any[] = []
) => {
    const cls = String(clsRaw || '').toUpperCase().trim();
    const src = resolveToCode(srcRaw);
    const dst = resolveToCode(dstRaw);

    // 1. Check for Custom Price Overrides (PriceRequests)
    const custom = customPrices.find(p => 
        resolveToCode(p.source) === src && 
        resolveToCode(p.destination) === dst && 
        p.class === cls &&
        (p.status === 'COMPLETED' || p.status === 'UPDATED')
    );
    if (custom && custom.suggestedPrice) {
        console.log(`[Pricing] MATCH Custom Price for ${src}->${dst} (${cls}): ${custom.suggestedPrice}`);
        return Math.round(custom.suggestedPrice);
    }

    // 2. Dynamic Corridor Logic
    console.log(`[Pricing] Checking Corridors for ${src} -> ${dst} (${cls}). Count: ${corridors.length}`);
    for (const corridor of corridors) {
        try {
            const origins = JSON.parse(corridor.originStations || '[]').map((s: any) => resolveToCode(String(s)));
            const destinations = JSON.parse(corridor.destinationStations || '[]').map((s: any) => resolveToCode(String(s)));
            
            const matchForward = origins.includes(src) && destinations.includes(dst);
            const matchReverse = origins.includes(dst) && destinations.includes(src);

            if (matchForward || matchReverse) {
                console.log(`[Pricing] MATCH Corridor ${corridor.name} for ${src}<->${dst}`);
                if (cls === 'SL' && corridor.markupSL > 0) return Math.round(corridor.markupSL);
                if ((cls === '3A' || cls === '3E' || cls === 'CC') && corridor.markup3A > 0) return Math.round(corridor.markup3A);
                if ((cls === '2A' || cls === '1A' || cls === 'FC') && corridor.markup2A > 0) return Math.round(corridor.markup2A);
            }
        } catch (e) {
            console.error('[Pricing] Failed to parse corridor stations', e);
        }
    }

    // 3. Fractional Formula Logic (Fallback)
    let totalHours = 8;
    if (tTravelTime) {
        const parts = tTravelTime.split(':');
        if (parts.length >= 2) {
            totalHours = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
        }
    }
    totalHours = Math.max(2, totalHours);

    // Standard Formulas
    const price = (cls === '3A' || cls === '3E' || cls === 'CC') ? Math.round(300 + (80 * totalHours)) :
                  (cls === '2A' || cls === '1A' || cls === 'FC') ? Math.round(450 + (105 * totalHours)) :
                  Math.round(600 + (50 * totalHours));

    return price;
};
