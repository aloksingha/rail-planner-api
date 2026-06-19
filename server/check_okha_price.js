const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridors = await prisma.corridorPricing.findMany({
    where: {
      OR: [
        { name: { contains: 'GUWAHATI', mode: 'insensitive' } },
        { name: { contains: 'OKHA', mode: 'insensitive' } },
        { destinationStations: { contains: 'OKHA', mode: 'insensitive' } },
        { originStations: { contains: 'GHY', mode: 'insensitive' } }
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
