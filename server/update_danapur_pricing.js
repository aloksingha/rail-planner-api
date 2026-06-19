const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridorName = "DELHI - DANAPUR";
  const data = {
    name: corridorName,
    originStations: JSON.stringify(["NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC"]),
    destinationStations: JSON.stringify(["DNR", "PNBE", "RJPB", "PPTA", "BKP", "HJP"]),
    markupSL: 1500,
    markup3A: 2500,
    markup2A: 3300
  };

  const existing = await prisma.corridorPricing.findFirst({
    where: { name: corridorName }
  });

  if (existing) {
    console.log(`[Pricing] Found existing corridor ${corridorName}. Updating...`);
    const updated = await prisma.corridorPricing.update({
      where: { id: existing.id },
      data: data
    });
    console.log(`[Pricing] Updated successfully:`, updated);
  } else {
    console.log(`[Pricing] No existing corridor ${corridorName}. Creating new...`);
    const created = await prisma.corridorPricing.create({
      data: data
    });
    console.log(`[Pricing] Created successfully:`, created);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
