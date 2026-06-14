import { prisma } from './prisma';

async function test() {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log("Querying stats counts...");
    const roleCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true }
    });
    console.log("roleCounts:", roleCounts);

    console.log("Querying todayAmountAgg...");
    const todayAmountAgg = await prisma.paymentRecord.aggregate({
        where: { 
            status: 'CAPTURED', 
            createdAt: { gte: todayStart } 
        },
        _sum: { amount: true }
    });
    console.log("todayAmountAgg:", todayAmountAgg);

    console.log("Querying timeline raw...");
    const timelineRaw = await prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(id) as count, SUM(amount) as amount
        FROM "PaymentRecord"
        WHERE status = 'CAPTURED' AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY day
        ORDER BY day ASC
    `;
    console.log("timelineRaw:", timelineRaw);
  } catch (err: any) {
    console.error("ERROR OCCURRED:", err);
  }
}

test();
