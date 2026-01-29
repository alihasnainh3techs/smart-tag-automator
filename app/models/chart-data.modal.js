import db from "../db.server";

export async function getRulesData(shop) {
    return db.rule.findMany({
        where: { shop },
        select: {
            ruleName: true,
            totalAppliedCount: true,
        },
        orderBy: {
            totalAppliedCount: 'desc',
        },
        take: 5,
    });
}

export async function getTaggedProductsData(shop) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return db.webhooklog.groupBy({
        by: ['createdAt'],
        where: {
            shop,
            status: 'SUCCESS',
            createdAt: { gte: sevenDaysAgo }
        },
        _count: {
            productId: true
        }
    });
}