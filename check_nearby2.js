const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });
const prisma = new PrismaClient();

async function check() {
    const nearbys = await prisma.stationNearby.findMany({
        where: { stationCode: 'SMVB' }
    });
    console.log(nearbys);
}
check();
