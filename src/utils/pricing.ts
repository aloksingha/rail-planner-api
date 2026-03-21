export const NEARBY_STATIONS: Record<string, string[]> = {
    // Delhi/NCR
    'NDLS': ['DLI', 'NZM', 'GZB', 'ANVT', 'DEC'],
    'DLI': ['NDLS', 'NZM', 'GZB', 'ANVT', 'DEC'],
    'NZM': ['NDLS', 'DLI', 'GZB', 'ANVT', 'DEC'],
    'ANVT': ['NDLS', 'DLI', 'NZM', 'GZB'],
    // Kolkata
    'HWH': ['SDAH', 'KOAA', 'SHM'],
    'SDAH': ['HWH', 'KOAA', 'SHM'],
    'KOAA': ['HWH', 'SDAH', 'SHM'],
    'SHM': ['HWH', 'SDAH', 'KOAA'],
    // Mumbai
    'MMCT': ['BDTS', 'BCT', 'DDR', 'CSMT', 'LTT'],
    'BDTS': ['MMCT', 'BCT', 'DDR', 'CSMT', 'LTT'],
    'CSMT': ['LTT', 'DR', 'MMCT', 'BDTS'],
    'LTT': ['CSMT', 'DR', 'MMCT', 'BDTS'],
    // Bengaluru
    'SBC': ['YPR', 'SMVB', 'KJM', 'BNC'],
    'YPR': ['SBC', 'SMVB', 'KJM', 'BNC'],
    'SMVB': ['SBC', 'YPR', 'KJM', 'BNC'],
    // Chennai
    'MAS': ['MS', 'TBM', 'PER'],
    'MS': ['MAS', 'TBM', 'PER'],
    // Guwahati
    'GHY': ['KYQ'],
    'KYQ': ['GHY'],
    // Hyderabad
    'SC': ['HYB', 'KCG'],
    'HYB': ['SC', 'KCG'],
    'KCG': ['SC', 'HYB'],
    // Pune/Surat
    'PUNE': ['SVJR', 'CCH'],
    'ST': ['UDN', 'CHM'],
    // Jharkhand
    'DHN': ['GMO', 'BKSC', 'CRP', 'ASN'],
    'HTE': ['RNC', 'MURI'],
    'RNC': ['HTE', 'MURI'],
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

    // 1. Check Custom Prices (Price Requests)
    const customPrice = customPrices.find(p => {
        const pSource = extractCode(p.source);
        const pDest = extractCode(p.destination);
        const matches = pSource === src &&
            pDest === dst &&
            String(p.class).toUpperCase() === cls &&
            (tName ? String(p.trainName).toUpperCase() === String(tName).toUpperCase() : true);
        if (!matches) return false;
        const updatedAt = new Date(p.updatedAt);
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        return updatedAt >= threeHoursAgo;
    });
    if (customPrice && customPrice.suggestedPrice) return customPrice.suggestedPrice;

    // 2. Premium Train Logic
    const isPremiumTrain = tName ? /(satabdi|shatabdi|rajdhani|vande\s*bharat|duronto|amrit\s*bharat)/i.test(tName) : false;
    if (isPremiumTrain) return 0;

    // 3. Dynamic Corridor Logic
    for (const corridor of corridors) {
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

            origins = origins.map(s => extractCode(s)).filter(Boolean);
            dests = dests.map(s => extractCode(s)).filter(Boolean);
            
            const sourceGroup = [src, ...(NEARBY_STATIONS[src] || [])].map(s => extractCode(s));
            const destGroup = [dst, ...(NEARBY_STATIONS[dst] || [])].map(s => extractCode(s));

            const matchOrigin = origins.some(o => sourceGroup.includes(o));
            const matchDest = dests.some(d => destGroup.includes(d));
            const matchOriginRev = origins.some(o => destGroup.includes(o));
            const matchDestRev = dests.some(d => sourceGroup.includes(d));

            if ((matchOrigin && matchDest) || (matchOriginRev && matchDestRev)) {
                let price = 0;
                
                // Note: We intentionally skip corridor.markupSL here to allow SL to 
                // always fall back to the dynamic time-based formula below, 
                // UNLESS it was already caught by the manual PriceRequest (Super Admin) above.
                if (cls === '3A' || cls === '3E' || cls === 'CC') price = corridor.markup3A;
                if (cls === '2A' || cls === '1A' || cls === 'FC') price = corridor.markup2A;
                
                if (price > 0) return price;
            }
        } catch (e) {
            console.error('Corridor matching error', e);
        }
    }

    // 4. Fractional Fallback Logic
    let totalHours = 8;
    if (tTravelTime) {
        const parts = tTravelTime.split(':');
        if (parts.length >= 2) {
            totalHours = parseInt(parts[0], 10) + (parseInt(parts[1], 10) / 60);
        }
    }
    totalHours = Math.max(2, totalHours);

    if (cls === '3A' || cls === '3E' || cls === 'CC') return Math.round(300 + (80 * totalHours));
    
    // Updated 2A formula: 450 + (105 * totalHours)
    if (cls === '2A' || cls === '1A' || cls === 'FC') return Math.round(450 + (105 * totalHours));
    
    // Updated SL formula to equal 3000 for a 48-hour travel time: 600 + (50 * 48) = 3000
    return Math.round(600 + (50 * totalHours));
};
