const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corridorName = "GUWAHATI - OKHA";
  const data = {
    name: corridorName,
    originStations: JSON.stringify(["GHY", "KYQ", "RNY", "NBQ", "APDJ"]),
    destinationStations: JSON.stringify(["OKHA", "DWK", "JAM", "HAPA", "RJT", "VG", "SUNR", "ADI"]),
    markupSL: 3000,
    markup3A: 4500,
    markup2A: 5600
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
