require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNearby() {
    const nearbys = await prisma.stationNearby.findMany({
        where: { stationCode: 'HWH' }
    });
    console.log('HWH nearbys:', nearbys);
    
    // Also check what is mapped as nearby for SMVB
    const nearbysDest = await prisma.stationNearby.findMany({
        where: { stationCode: 'SMVB' }
    });
    console.log('SMVB nearbys:', nearbysDest);
}

checkNearby().finally(() => prisma.$disconnect());
