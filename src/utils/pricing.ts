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
    const cleaned = str.split('(')[0].split('-')[0].trim().toUpperCase();
    if (cleaned.length <= 6 && !cleaned.includes(' ')) return cleaned;
    return cleaned;
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
    const src = extractCode(srcRaw);
    const dst = extractCode(dstRaw);

    // 1. & 2. Bypassed Fixed/Premium logic for standard classes 
    // as per user request to enforce global consistency using the formula.
    // Custom prices (PriceRequests) and Corridor markups are currently ignored
    // to prevent local price inversions (e.g. short distance > long distance).
    
    // 3. Dynamic Corridor Logic - Bypassed for standard classes
    /*
    for (const corridor of corridors) {
        ... (mapping logic)
    }
    */

    // 4. Fractional Formula Logic
    let totalHours = 8;
    if (tTravelTime) {
        const parts = tTravelTime.split(':');
        if (parts.length >= 2) {
            totalHours = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
        }
    }
    totalHours = Math.max(2, totalHours);

    // Standard Formulas (Primary pricing method)
    if (cls === '3A' || cls === '3E' || cls === 'CC') return Math.round(300 + (80 * totalHours));
    if (cls === '2A' || cls === '1A' || cls === 'FC') return Math.round(450 + (105 * totalHours));
    
    // Default SL formula: 600 + (50 * totalHours)
    return Math.round(600 + (50 * totalHours));
};
