"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const prisma_1 = require("../../prisma");
const router = (0, express_1.Router)();
/**
 * Helper to parse booking amount from payment record or event description
 */
function resolveBookingAmount(booking, paymentMap) {
    if (booking.paymentId && paymentMap.has(booking.paymentId)) {
        return paymentMap.get(booking.paymentId);
    }
    if (booking.event?.description) {
        const amtMatch = booking.event.description.match(/Amount:\s*(?:₹|Rs\.?)?\s*([\d.]+)/i);
        if (amtMatch && amtMatch[1]) {
            const parsed = parseFloat(amtMatch[1]);
            if (!isNaN(parsed) && parsed > 0)
                return parsed;
        }
    }
    return 0;
}
/**
 * GET /api/admin/gst-report
 * Returns GSTR-3B monthly tax summary, SAC 996411 totals, and GSTR-1 itemized invoice register
 */
router.get('/gst-report', auth_1.requireAuth, (0, auth_1.requireRole)(['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER']), async (req, res) => {
    try {
        const { month, year, startDate, endDate } = req.query;
        let start;
        let end;
        if (month && year) {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            start = new Date(y, m - 1, 1, 0, 0, 0, 0);
            end = new Date(y, m, 0, 23, 59, 59, 999);
        }
        else if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }
        else {
            // Default to current calendar year
            const now = new Date();
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }
        // Multi-tenant scoping: Admins only see bookings of users they created; Sales Managers see their own
        let userFilter = {};
        if (!req.user.isSuperAdmin && req.user.role === 'ADMIN') {
            userFilter = { user: { createdByUserId: req.user.userId } };
        }
        else if (!req.user.isSuperAdmin && req.user.role === 'SALES_MANAGER') {
            userFilter = { user: { id: req.user.userId } };
        }
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end
                },
                status: { notIn: ['CANCELLED', 'FAILED'] },
                ...userFilter
            },
            include: {
                event: true,
                user: { select: { id: true, name: true, email: true, mobile: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        const paymentIds = bookings.map(b => b.paymentId).filter(Boolean);
        const payments = await prisma_1.prisma.paymentRecord.findMany({
            where: { paymentId: { in: paymentIds } }
        });
        const paymentMap = new Map(payments.map(p => [p.paymentId, p.amount]));
        let totalGrossTurnover = 0;
        let totalTaxableValue = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        let totalExemptTurnover = 0;
        let acCount = 0;
        let sleeperCount = 0;
        const invoices = bookings.map(b => {
            const totalAmount = resolveBookingAmount(b, paymentMap);
            totalGrossTurnover += totalAmount;
            const upperClass = String(b.class || '').toUpperCase();
            const isAcClass = ['1A', '2A', '3A', '3E', 'CC', 'EC', 'EV', 'FC', 'AC'].some(c => upperClass.includes(c));
            const isExempt = !isAcClass;
            let gstRate = 5.0;
            let taxableAmount = totalAmount;
            let cgst = 0;
            let sgst = 0;
            let igst = 0;
            if (!isExempt && totalAmount > 0) {
                acCount++;
                const rawBase = totalAmount / 1.05;
                const rawTaxPerComponent = rawBase * 0.025;
                cgst = Math.round(rawTaxPerComponent * 100) / 100;
                sgst = cgst; // Indian GST statutory parity
                const totalTax = cgst + sgst;
                taxableAmount = Math.round((totalAmount - totalTax) * 100) / 100;
                totalTaxableValue += taxableAmount;
                totalCGST += cgst;
                totalSGST += sgst;
            }
            else {
                sleeperCount++;
                gstRate = 0;
                taxableAmount = totalAmount;
                totalExemptTurnover += totalAmount;
            }
            const cleanId = b.id.replace(/-/g, '').slice(0, 8).toUpperCase();
            const invYear = new Date(b.createdAt).getFullYear();
            const invoiceNumber = `INV-${invYear}-${cleanId}`;
            // Customer info
            let customerMobile = b.user?.mobile || '';
            let customerName = b.user?.name || '';
            if (!customerMobile && b.event?.description) {
                const mobMatch = b.event.description.match(/Mobile:\s*([+0-9\s-]+)/i);
                if (mobMatch && mobMatch[1])
                    customerMobile = mobMatch[1].replace(/\D/g, '').slice(-10);
            }
            if ((!customerName || customerName.includes('Admin')) && b.event?.description) {
                const pMatch = b.event.description.match(/Passengers:\s*([^.]+)/i);
                if (pMatch && pMatch[1]) {
                    const firstP = pMatch[1].split(/[;,]/)[0]?.split('(')[0]?.trim();
                    if (firstP)
                        customerName = firstP;
                }
            }
            return {
                bookingId: b.id,
                invoiceNumber,
                invoiceDate: new Date(b.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                customerName: customerName || 'Valued Passenger',
                customerMobile: customerMobile || 'N/A',
                customerEmail: b.user?.email || 'N/A',
                customerGstin: 'URP', // Unregistered Person (B2C)
                placeOfSupply: '19-West Bengal',
                sacCode: '996411',
                serviceDescription: isExempt
                    ? 'Passenger Transport by Rail (Non-AC Sleeper - Exempt)'
                    : 'Passenger Transport by Rail (AC Class - 5% GST)',
                bookingClass: b.class || 'Standard',
                taxRate: gstRate,
                taxableAmount: Math.round(taxableAmount * 100) / 100,
                cgst: Math.round(cgst * 100) / 100,
                sgst: Math.round(sgst * 100) / 100,
                igst: 0,
                totalAmount: Math.round(totalAmount * 100) / 100,
                pdfUrl: `/api/invoices/${b.id}?view=true`,
                downloadUrl: `https://rail-planner-api.onrender.com/api/invoices/${b.id}?download=true`
            };
        });
        const totalTax = Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100;
        return res.json({
            success: true,
            supplierInfo: {
                legalName: 'Pradip Enterprises',
                tradeName: 'Tickets Pro',
                gstin: '19BOOPA3821C1Z9',
                address: 'Machhol, Altapur, West Bengal - 733215',
                state: 'West Bengal (19)',
                sacCode: '996411'
            },
            period: {
                start: start.toISOString(),
                end: end.toISOString()
            },
            summary: {
                totalInvoices: invoices.length,
                totalGrossTurnover: Math.round(totalGrossTurnover * 100) / 100,
                totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
                totalCGST: Math.round(totalCGST * 100) / 100,
                totalSGST: Math.round(totalSGST * 100) / 100,
                totalIGST: Math.round(totalIGST * 100) / 100,
                totalTax,
                totalExemptTurnover: Math.round(totalExemptTurnover * 100) / 100,
                sacSummary: [
                    {
                        sac: '996411',
                        description: 'Passenger Transport by Rail (AC Class)',
                        rate: '5%',
                        taxRate: 5,
                        count: acCount,
                        taxableValue: Math.round(totalTaxableValue * 100) / 100,
                        cgst: Math.round(totalCGST * 100) / 100,
                        sgst: Math.round(totalSGST * 100) / 100,
                        igst: 0,
                        totalValue: Math.round((totalTaxableValue + totalCGST + totalSGST) * 100) / 100
                    },
                    {
                        sac: '996411',
                        description: 'Passenger Transport by Rail (Non-AC Sleeper - Exempt)',
                        rate: '0%',
                        taxRate: 0,
                        count: sleeperCount,
                        taxableValue: Math.round(totalExemptTurnover * 100) / 100,
                        cgst: 0,
                        sgst: 0,
                        igst: 0,
                        totalValue: Math.round(totalExemptTurnover * 100) / 100
                    }
                ]
            },
            invoices
        });
    }
    catch (error) {
        console.error('[GST Report API Error]:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to generate GST report' });
    }
});
exports.default = router;
