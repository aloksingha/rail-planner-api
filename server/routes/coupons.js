"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET / - List all coupons (Super Admin and Admin)
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
    const coupons = await prisma_1.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' }
    });
    res.json(coupons);
});
// POST /validate - Validate a coupon code
router.post('/validate', async (req, res) => {
    const { code, amount } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Coupon code is required' });
    }
    const coupon = await prisma_1.prisma.coupon.findUnique({
        where: { code: code.toUpperCase() }
    });
    if (!coupon || !coupon.isActive) {
        return res.status(404).json({ error: 'Invalid or inactive coupon code' });
    }
    // Check expiry
    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
        return res.status(400).json({ error: 'Coupon has expired' });
    }
    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    // Check minimum booking amount
    if (amount < coupon.minBookingAmount) {
        return res.status(400).json({
            error: `Minimum booking amount for this coupon is ₹${coupon.minBookingAmount.toFixed(2)}`
        });
    }
    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
        discount = (amount * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
        }
    }
    else {
        discount = coupon.discountValue;
    }
    // Ensure discount doesn't exceed amount
    if (discount > amount) {
        discount = amount;
    }
    res.json({
        code: coupon.code,
        discount: Number(discount.toFixed(2)),
        type: coupon.discountType,
        value: coupon.discountValue
    });
});
// POST / - Create a coupon (Super Admin only)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { code, discountType, discountValue, minBookingAmount, maxDiscount, expiryDate, usageLimit } = req.body;
    // Basic validation
    if (!code || !discountType || discountValue === undefined) {
        return res.status(400).json({ error: 'Missing required coupon fields' });
    }
    try {
        const coupon = await prisma_1.prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                discountType,
                discountValue: parseFloat(discountValue),
                minBookingAmount: parseFloat(minBookingAmount || 0),
                maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                usageLimit: usageLimit ? parseInt(usageLimit) : null,
            }
        });
        res.status(201).json(coupon);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});
// PUT /:id - Update a coupon (Super Admin only)
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    const { isActive, discountValue, minBookingAmount, maxDiscount, expiryDate, usageLimit } = req.body;
    try {
        const coupon = await prisma_1.prisma.coupon.update({
            where: { id: id },
            data: {
                isActive,
                discountValue: discountValue !== undefined ? parseFloat(discountValue) : undefined,
                minBookingAmount: minBookingAmount !== undefined ? parseFloat(minBookingAmount) : undefined,
                maxDiscount: maxDiscount !== undefined ? (maxDiscount ? parseFloat(maxDiscount) : null) : undefined,
                expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
                usageLimit: usageLimit !== undefined ? (usageLimit ? parseInt(usageLimit) : null) : undefined,
            }
        });
        res.json(coupon);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update coupon' });
    }
});
// DELETE /:id - Delete a coupon (Super Admin only)
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN']), async (req, res) => {
    const { id } = req.params;
    console.log(`[Coupon] Delete request for ID: ${id} by user: ${req.user?.email} (${req.user?.role})`);
    try {
        const deleted = await prisma_1.prisma.coupon.delete({ where: { id: id } });
        console.log(`[Coupon] Successfully deleted: ${deleted.code}`);
        res.json({ message: 'Coupon deleted successfully' });
    }
    catch (error) {
        console.error(`[Coupon] Delete failed for ID: ${id}:`, error.message);
        res.status(500).json({ error: 'Failed to delete coupon: ' + error.message });
    }
});
exports.default = router;
