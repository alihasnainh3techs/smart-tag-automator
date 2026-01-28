import db from "../db.server";

const PAGE_SIZE = 10;

export async function getProductsRulesLogs(shop, page = 1, query) {
    const skip = (page - 1) * PAGE_SIZE;

    const totalCount = await db.activitylog.count({
        where: { shop },
    });

    const logs = await db.activitylog.findMany({
        where: {
            shop,
            OR: [
                {
                    rule: {
                        ruleName: {
                            contains: query,
                        },
                    },
                },
                {
                    ruleId: null,
                },
            ],
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: skip,
        select: {
            id: true,
            status: true,
            productsUpdated: true,
            reason: true,
            createdAt: true,
            rule: {
                select: {
                    id: true,
                    ruleName: true,
                }
            }
        }
    });

    if (logs.length === 0) return {
        logs: [],
        totalCount,
        hasNextPage: false,
        hasPreviousPage: false,
    };

    return {
        logs,
        totalCount,
        hasNextPage: totalCount > page * PAGE_SIZE,
        hasPreviousPage: page > 1,
    };

}

export async function getWebhooksLogs(shop, graphql, page = 1, query) {
    const skip = (page - 1) * PAGE_SIZE;

    const totalCount = await db.webhooklog.count({
        where: { shop },
    });

    const logs = await db.webhooklog.findMany({
        where: {
            shop,
            OR: [
                {
                    rule: {
                        ruleName: {
                            contains: query,
                        },
                    },
                },
                {
                    ruleId: null,
                },
            ],
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
        select: {
            id: true,
            productId: true,
            triggerType: true,
            appliedTags: true,
            status: true,
            reason: true,
            createdAt: true,
            rule: {
                select: {
                    id: true,
                    ruleName: true,
                },
            },
        },
    });

    if (!logs.length) {
        return {
            logs: [],
            totalCount,
            hasNextPage: false,
            hasPreviousPage: false,
        };
    }

    const enrichedLogs = await Promise.all(
        logs.map((log) =>
            hydrateLog(log, graphql)
        )
    );

    return {
        logs: enrichedLogs,
        totalCount,
        hasNextPage: totalCount > page * PAGE_SIZE,
        hasPreviousPage: page > 1,
    };
}

export async function hydrateLog(log, graphql) {
    const response = await graphql(`query GetProductBasicInfo($id: ID!) {
      product(id: $id) {
        title
        featuredMedia {
          ... on MediaImage {
            image {
              url
              altText
            }
          }
        }
      }
    }
    `,
        {
            variables: {
                id: log.productId,
            },
        }
    );

    const {
        data: { product },
    } = await response.json();

    return {
        ...log,
        productDeleted: !product?.title,
        productTitle: product?.title,
        productImage: product?.featuredMedia?.image?.url,
        productAlt: product?.featuredMedia?.image?.altText,
    }
}
