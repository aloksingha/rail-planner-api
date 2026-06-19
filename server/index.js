"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const seed_1 = require("./seed");
const prisma_1 = require("./prisma");
const PORT = process.env.PORT || 5000;
app_1.default.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Auto-seed corridor pricing rules (non-blocking)
    (0, seed_1.seedCorridors)();
    // Specific update for Kolkata-Chennai pricing rules
    try {
        const targetNames = ['KOLKATA-CHENNAI', 'CHENNAI-KOLKATA'];
        for (const name of targetNames) {
            const corridor = await prisma_1.prisma.corridorPricing.findFirst({ where: { name } });
            if (corridor) {
                await prisma_1.prisma.corridorPricing.update({
                    where: { id: corridor.id },
                    data: { markupSL: 2513, markup3A: 3900, markup2A: 5188 }
                });
                console.log(`[Startup] Successfully updated pricing for ${name}`);
            }
        }
    }
    catch (e) {
        console.error('[Startup] Failed to update Kolkata-Chennai pricing:', e);
    }
});
