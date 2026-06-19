const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridors = await prisma.corridorPricing.findMany({
    where: {
      OR: [
        { name: { contains: 'DANAPUR', mode: 'insensitive' } },
        { name: { contains: 'PATNA', mode: 'insensitive' } },
        { destinationStations: { contains: 'DNR', mode: 'insensitive' } },
        { destinationStations: { contains: 'PNBE', mode: 'insensitive' } }
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
