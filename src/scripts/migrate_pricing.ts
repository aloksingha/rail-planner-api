
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEARBY_STATIONS: Record<string, string[]> = {
    'NDLS': ['DLI', 'NZM', 'DEC', 'DEE', 'ANVT', 'GZB', 'SZM', 'DSA', 'SSB'],
    'DLI': ['NDLS', 'NZM', 'DEC', 'DEE', 'ANVT', 'GZB', 'SZM', 'DSA', 'SSB'],
    'NZM': ['NDLS', 'DLI', 'DEC', 'DEE', 'ANVT', 'GZB', 'SZM', 'DSA', 'SSB'],
    'ANVT': ['NDLS', 'DLI', 'NZM', 'GZB', 'DEE', 'SZM', 'DSA'],
    'HWH': ['SDAH', 'KOAA', 'SHM', 'SRC', 'BDC', 'KGP'],
    'SDAH': ['HWH', 'KOAA', 'SHM', 'SRC', 'BDC', 'KGP'],
    'KOAA': ['HWH', 'SDAH', 'SHM', 'SRC', 'BDC', 'KGP'],
    'SHM': ['HWH', 'SDAH', 'KOAA', 'SRC', 'KGP'],
    'SRC': ['HWH', 'SDAH', 'KOAA', 'SHM', 'KGP'],
    'NJP': ['SGUJ', 'SGUT', 'SGU'],
    'SGUJ': ['NJP', 'SGUT', 'SGU'],
    'MMCT': ['BDTS', 'BCT', 'DDR', 'CSMT', 'LTT', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'BDTS': ['MMCT', 'BCT', 'DDR', 'CSMT', 'LTT', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'CSMT': ['LTT', 'DR', 'MMCT', 'BDTS', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'LTT': ['CSMT', 'DR', 'MMCT', 'BDTS', 'BVI', 'PNVL', 'KYN', 'TNA'],
    'BVI': ['MMCT', 'BDTS', 'DDR', 'CSMT', 'LTT'],
    'TNA': ['LTT', 'CSMT', 'KYN', 'DR', 'PNVL'],
    'PNVL': ['LTT', 'CSMT', 'TNA', 'KYN'],
    'SBC': ['YPR', 'SMVB', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    'YPR': ['SBC', 'SMVB', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    'SMVB': ['SBC', 'YPR', 'KJM', 'BNC', 'BAND', 'YNK', 'BNCE', 'KGI'],
    'MAS': ['MS', 'TBM', 'PER', 'MSB', 'AJJ'],
    'MS': ['MAS', 'TBM', 'PER', 'MSB', 'AJJ'],
    'TBM': ['MAS', 'MS', 'PER', 'MSB', 'AJJ'],
    'GHY': ['KYQ', 'NGC'],
    'KYQ': ['GHY', 'NGC'],
    'SC': ['HYB', 'KCG', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'HYB': ['SC', 'KCG', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'KCG': ['SC', 'HYB', 'CHZ', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'CHZ': ['SC', 'HYB', 'KCG', 'LPI', 'BMO', 'BMT', 'FM', 'SNF'],
    'PUNE': ['SVJR', 'CCH', 'LNL', 'PMP'],
    'ST': ['UDN', 'CHM'],
    'ADI': ['SBIB', 'SBT', 'MAN', 'GNC'],
    'PNBE': ['DNR', 'PPTA', 'RJPB', 'PNC'],
    'DNR': ['PNBE', 'PPTA', 'RJPB', 'PNC'],
    'PPTA': ['PNBE', 'DNR', 'RJPB', 'PNC'],
    'LKO': ['LJN', 'ASH', 'GTNR', 'BNZ'],
    'LJN': ['LKO', 'ASH', 'GTNR', 'BNZ'],
    'BSB': ['DDU', 'BSBS', 'MUV', 'BCY'],
    'DDU': ['BSB', 'BSBS', 'MUV', 'BCY'],
    'PRYJ': ['PRG', 'NYN', 'SFG', 'BPL'],
    'BBS': ['KUR', 'CTC', 'BBSN'],
    'CNB': ['CPA', 'GOY'],
    'AGC': ['AF', 'IDH', 'AH'],
    'DHN': ['GMO', 'BKSC', 'CRP', 'ASN'],
    'HTE': ['RNC', 'MURI'],
    'RNC': ['HTE', 'MURI'],
    'BPL': ['HBJ', 'RKMP', 'ET'],
    'RKMP': ['BPL', 'HBJ', 'ET'],
    'NGP': ['NGPK', 'ITR', 'WR'],
    'JBP': ['MML'],
    'ERS': ['ERN', 'AWY', 'IPL'],
    'ERN': ['ERS', 'AWY', 'IPL'],
    'TVC': ['KCVL', 'TVP'],
};

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
    'SMVT BENGALURU': 'SMVB',
    'KOLKATA': 'HWH',
    'HOWRAH': 'HWH',
    'GUWAHATI': 'GHY',
    'PAT पटना': 'PNBE',
    'PATNA': 'PNBE',
    'DHANBAD': 'DHN',
    'RANCHI': 'RNC'
};

async function main() {
    console.log('--- Starting Pricing Migration ---');

    // 1. Migrate Station Mappings
    console.log('Migrating Station Mappings...');
    for (const [name, code] of Object.entries(NAME_TO_CODE)) {
        await prisma.stationMapping.upsert({
            where: { code },
            update: { name },
            create: { code, name }
        });
    }

    // 2. Migrate Nearby Stations
    console.log('Migrating Nearby Stations...');
    for (const [code, nearybys] of Object.entries(NEARBY_STATIONS)) {
        for (const nearbyCode of nearybys) {
            await prisma.stationNearby.upsert({
                where: {
                    stationCode_nearbyCode: {
                        stationCode: code,
                        nearbyCode: nearbyCode
                    }
                },
                update: {},
                create: {
                    stationCode: code,
                    nearbyCode: nearbyCode
                }
            });
        }
    }

    // 3. Migrate Pricing Rules (Fallback Formula)
    console.log('Migrating Pricing Rules...');
    const rules = [
        { class: 'SL', basePrice: 150, pricePerHour: 35, fixedMarkup: 200 + 1200 },
        { class: '3A', basePrice: 300, pricePerHour: 80, fixedMarkup: 400 + 1000 },
        { class: '3E', basePrice: 300, pricePerHour: 80, fixedMarkup: 400 + 1000 },
        { class: 'CC', basePrice: 300, pricePerHour: 80, fixedMarkup: 400 + 1000 },
        { class: '2A', basePrice: 450, pricePerHour: 125, fixedMarkup: 500 + 800 },
        { class: '1A', basePrice: 450, pricePerHour: 125, fixedMarkup: 500 + 800 },
        { class: 'FC', basePrice: 450, pricePerHour: 125, fixedMarkup: 500 + 800 }
    ];

    for (const rule of rules) {
        await prisma.pricingRule.upsert({
            where: { class: rule.class },
            update: rule,
            create: rule
        });
    }

    // 4. Migrate Special Charges (Superfast)
    console.log('Migrating Special Charges...');
    await prisma.specialCharge.upsert({
        where: { name: 'SUPERFAST' },
        update: {
            pattern: '(superfast|sf|mail|express\\s*sf|duronto|rajdhani|tejas)',
            amountSL: 45,
            amount3A: 60,
            amount2A: 60,
            amount2S: 15
        },
        create: {
            name: 'SUPERFAST',
            pattern: '(superfast|sf|mail|express\\s*sf|duronto|rajdhani|tejas)',
            amountSL: 45,
            amount3A: 60,
            amount2A: 60,
            amount2S: 15
        }
    });

    console.log('--- Pricing Migration Completed ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
