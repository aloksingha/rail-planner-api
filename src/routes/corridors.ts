import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { prisma } from '../prisma';
import { CacheService } from '../utils/cache';
import { createAuditLog } from '../services/auditService';

const router = Router();

// Seed default corridors (for production setup)
router.post('/seed', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'CORRIDOR_PRICING' }), async (req, res) => {
    try {
        const defaults = [
            {
                name: "Secunderabad - NJP",
                originStations: JSON.stringify(["SC", "HYB", "KCG", "CHZ", "SECUNDERABAD"]),
                destinationStations: JSON.stringify(["NJP", "SGUJ", "SGUT", "SGU", "NEW JALPAIGURI"]),
                markupSL: 3000,
                markup3A: 4500,
                markup2A: 5500
            },
            {
                name: "Delhi - Mumbai",
                originStations: JSON.stringify(["NDLS", "DLI", "NZM", "ANVT"]),
                destinationStations: JSON.stringify(["CSMT", "MMCT", "BDTS", "LTT"]),
                markupSL: 2500,
                markup3A: 3800,
                markup2A: 4800
            },
            ...[
                { name: "Delhi", codes: ["NDLS", "DLI", "NZM", "ANVT", "DEE"] },
                { name: "Mumbai", codes: ["CSMT", "MMCT", "BDTS", "LTT", "DR", "KYN", "BCT"] },
                { name: "Secunderabad", codes: ["SC", "HYB", "KCG", "LPI"] },
                { name: "Bangalore", codes: ["SBC", "YPR", "BNC", "KJM", "SMVB"] },
                { name: "Kerala", codes: ["ERS", "ERN", "TVC", "KCVL", "SRR", "CLT", "PGT", "KTYM", "CNGR", "QLN"] },
                { name: "Tamil Nadu", codes: ["MAS", "MS", "MSB", "TBM", "CAPE", "MDU", "CBE", "TPJ"] },
                { name: "Goa", codes: ["MAO", "VSG", "KRMI"] },
                { name: "Bhopal", codes: ["BPL", "RKMP"] },
                { name: "Indore", codes: ["INDB", "DADN"] },
                { name: "Amritsar", codes: ["ASR"] },
                { name: "Jammu", codes: ["JAT", "SVDK"] },
                { name: "Sairang", codes: ["SANG"] }
            ].map(dest => ({
                name: `Kolkata - ${dest.name}`,
                originStations: JSON.stringify(["HWH", "SDAH", "KOAA", "SHM", "BWN"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: dest.name === "Sairang" ? 2000 : 3000,
                markup3A: dest.name === "Sairang" ? 3000 : 4500,
                markup2A: dest.name === "Sairang" ? 4000 : 5500
            })),
            ...[
                { name: "Bengaluru", codes: ["SBC", "SMVB", "YPR"] }
            ].map(dest => ({
                name: `Gorakhpur - ${dest.name}`,
                originStations: JSON.stringify(["GKP"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: 2700,
                markup3A: 3800,
                markup2A: 5200
            })),
            ...[
                { name: "Trivandrum", codes: ["TVC", "TVP", "KCVL"] }
            ].map(dest => ({
                name: `Gorakhpur - ${dest.name}`,
                originStations: JSON.stringify(["GKP"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: 3000,
                markup3A: 4500,
                markup2A: 5600
            })),
            ...[
                { name: "Hadapsar/Pune", codes: ["HDP", "PUNE"] }
            ].map(dest => ({
                name: `Danapur - ${dest.name}`,
                originStations: JSON.stringify(["DNR", "PNBE"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: 3000,
                markup3A: 4500,
                markup2A: 5600
            })),
            ...[
                { name: "Delhi", codes: ["NDLS", "DLI", "NZM", "ANVT", "DEE", "DEC"] }
            ].map(dest => ({
                name: `Pune - ${dest.name}`,
                originStations: JSON.stringify(["PUNE", "HDP"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: 3000,
                markup3A: 4500,
                markup2A: 5600
            })),
            ...[
                { name: "Jammu Tawi", codes: ["JAT", "SVDK"] }
            ].map(dest => ({
                name: `Pune - ${dest.name}`,
                originStations: JSON.stringify(["PUNE", "HDP"]),
                destinationStations: JSON.stringify(dest.codes),
                markupSL: 3000,
                markup3A: 4500,
                markup2A: 5600
            }))
        ];

        let createdCount = 0;
        for (const d of defaults) {
            const exists = await prisma.corridorPricing.findFirst({ where: { name: d.name } });
            if (!exists) {
                await prisma.corridorPricing.create({ data: d });
                createdCount++;
            }
        }

        return res.json({ success: true, message: `Seeded ${createdCount} new corridors. (Total checked: ${defaults.length})` });
    } catch (error: any) {
        console.error('Seed corridors error:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal Server Error', stack: error.stack });
    }
});

// Get all corridor pricing rules (Legacy alias for public access)
router.get('/public', async (req, res) => {
    try {
        const cached = await CacheService.get('corridors_all');
        if (cached) {
            return res.json({ success: true, corridors: JSON.parse(cached) });
        }
        const corridors = await prisma.corridorPricing.findMany({
            orderBy: { name: 'asc' }
        });
        await CacheService.set('corridors_all', JSON.stringify(corridors), 60 * 60); // 1 hour cache
        return res.json({ success: true, corridors });
    } catch (error: any) {
        console.error('Fetch corridors public error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Get all corridor pricing rules
router.get('/', async (req, res) => {
    try {
        const cached = await CacheService.get('corridors_all');
        if (cached) {
            return res.json({ success: true, corridors: JSON.parse(cached) });
        }
        const corridors = await prisma.corridorPricing.findMany({
            orderBy: { name: 'asc' }
        });
        await CacheService.set('corridors_all', JSON.stringify(corridors), 60 * 60); // 1 hour cache
        return res.json({ success: true, corridors });
    } catch (error: any) {
        console.error('Fetch corridors error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Create a new corridor pricing rule (Super Admin / Admin Only)
router.post('/', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'CORRIDOR_PRICING' }), async (req, res) => {
    const { name, originStations, destinationStations, markupSL, markup3A, markup2A } = req.body;

    if (!name || !originStations || !destinationStations) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const newCorridor = await prisma.corridorPricing.create({
            data: {
                name,
                originStations: JSON.stringify(originStations),
                destinationStations: JSON.stringify(destinationStations),
                markupSL: markupSL ? parseFloat(markupSL) : 0,
                markup3A: markup3A ? parseFloat(markup3A) : 0,
                markup2A: markup2A ? parseFloat(markup2A) : 0
            }
        });

        await CacheService.del('corridors_all');

        await createAuditLog({
            action: 'CREATE_CORRIDOR',
            performedByUserId: req.user!.userId,
            details: `Created Corridor Pricing rule: ${name}`
        });

        return res.json({ success: true, corridor: newCorridor });
    } catch (error: any) {
        console.error('Create corridor error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A corridor with this name already exists.' });
        }
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

// Update a corridor pricing rule (auto-syncs vice-versa)
router.put('/:id', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'CORRIDOR_PRICING' }), async (req, res) => {
    const { id } = req.params;
    const { name, originStations, destinationStations, markupSL, markup3A, markup2A } = req.body;

    try {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (originStations) updateData.originStations = JSON.stringify(originStations);
        if (destinationStations) updateData.destinationStations = JSON.stringify(destinationStations);
        if (markupSL !== undefined) updateData.markupSL = parseFloat(markupSL);
        if (markup3A !== undefined) updateData.markup3A = parseFloat(markup3A);
        if (markup2A !== undefined) updateData.markup2A = parseFloat(markup2A);

        const updatedCorridor = await prisma.corridorPricing.update({
            where: { id: id as string },
            data: updateData
        });

        await CacheService.del('corridors_all');

        await createAuditLog({
            action: 'UPDATE_CORRIDOR',
            performedByUserId: req.user!.userId,
            details: `Updated Corridor Pricing rule: ${updatedCorridor.name}`
        });

        // Note: Reverse syncing was removed because bidirectional routing applies dynamically.
        return res.json({ success: true, corridor: updatedCorridor, mirrorUpdated: false });
    } catch (error: any) {
        console.error('Update corridor error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});


// Delete a corridor pricing rule
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN'], { allowSpecialPermission: 'CORRIDOR_PRICING' }), async (req, res) => {
    const { id } = req.params;

    try {
        const corridor = await prisma.corridorPricing.delete({
            where: { id: id as string }
        });

        await CacheService.del('corridors_all');

        await createAuditLog({
            action: 'DELETE_CORRIDOR',
            performedByUserId: req.user!.userId,
            details: `Deleted Corridor Pricing rule: ${corridor.name}`
        });

        return res.json({ success: true, message: 'Corridor deleted successfully' });
    } catch (error: any) {
        console.error('Delete corridor error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

export default router;
