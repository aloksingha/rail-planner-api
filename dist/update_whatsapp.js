"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const whatsapp = 'https://wa.me/message/UN62JLOGU2QQC1';
    // Update or Create the singleton settings
    await prisma.globalSettings.upsert({
        where: { id: 'singleton' },
        update: { whatsapp },
        create: {
            id: 'singleton',
            whatsapp,
            email: 'support@ticketspro.in'
        }
    });
    console.log('✅ WhatsApp link updated successfully to:', whatsapp);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
