const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const kolkataStations = ["HWH", "SDAH", "KOAA", "SHM", "BWN"];

const destinations = [
    { name: "Delhi", codes: ["NDLS", "DLI", "NZM", "ANVT", "DEE"] },
    { name: "Mumbai", codes: ["CSMT", "MMCT", "BDTS", "LTT", "DR", "KYN", "BCT"] },
    { name: "Secunderabad", codes: ["SC", "HYB", "KCG", "LPI"] },
    { name: "Bangalore", codes: ["SBC", "YPR", "BNC", "KJM", "SMVB"] },
    { name: "Kerala", codes: ["ERS", "ERN", "TVC", "KCVL", "SRR", "CLT", "PGT", "KTYM", "CNGR", "QLN"] },
    { name: "Tamil Nadu", codes: ["MAS", "MS", "MSB", "TBM", "CAPE", "MDU", "CBE", "TPJ"] },
    { name: "Goa", codes: ["MAO", "VSG", "KRMI"] },
    { name: "Bhopal", codes: ["BPL", "RKMP"] },
    { name: "Indore", codes: ["INDB", "DADN"] },
    { name: "Amritsar", codes: ["ASR"] },
    { name: "Jammu", codes: ["JAT", "SVDK"] }
];

async function main() {
    let count = 0;
    for (const dest of destinations) {
        // Forward direction: Kolkata to Destination
        const nameForward = `Kolkata - ${dest.name}`;
        const existsF = await prisma.corridorPricing.findFirst({ where: { name: nameForward } });
        
        const dataF = {
            name: nameForward,
            originStations: JSON.stringify(kolkataStations),
            destinationStations: JSON.stringify(dest.codes),
            markupSL: 3000,
            markup3A: 4500,
            markup2A: 5500
        };

        if (existsF) {
            await prisma.corridorPricing.update({ where: { id: existsF.id }, data: dataF });
            console.log(`Updated ${nameForward}`);
        } else {
            await prisma.corridorPricing.create({ data: dataF });
            console.log(`Created ${nameForward}`);
            count++;
        }
    }
    console.log(`Finished processing Kolkata major corridors. (${count} new)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
