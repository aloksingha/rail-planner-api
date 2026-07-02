import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Querying StationNearby...');
    const nearbys = await prisma.stationNearby.findMany({
        where: { stationCode: 'HWH' }
    });
    console.log('HWH Nearbys:', nearbys);
    
    // Check KGP
    const kgpNearbys = await prisma.stationNearby.findMany({
        where: { stationCode: 'KGP' }
    });
    console.log('KGP Nearbys:', kgpNearbys);
}

main().catch(console.error).finally(() => prisma.$disconnect());
