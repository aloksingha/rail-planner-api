const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridors = await prisma.corridorPricing.findMany({
    where: {
      OR: [
        { name: { contains: 'DELHI', mode: 'insensitive' } },
        { name: { contains: 'BHOPAL', mode: 'insensitive' } },
        { originStations: { contains: 'BPL', mode: 'insensitive' } },
        { destinationStations: { contains: 'BPL', mode: 'insensitive' } }
      ]
    }
  });
  console.log(JSON.stringify(corridors, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
