const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridorName = "DELHI - BHOPAL";
  const data = {
    name: corridorName,
    originStations: JSON.stringify(["NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC"]),
    destinationStations: JSON.stringify(["BPL", "RKMP", "HBJ"]),
    markupSL: 800,
    markup3A: 1800,
    markup2A: 2500
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
