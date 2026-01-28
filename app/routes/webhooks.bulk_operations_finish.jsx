import { authenticate } from "../shopify.server";
import db from "../db.server";
import { bulkProcessingQueue } from "../queues";

export const action = async ({ request }) => {
    const { shop, topic, payload } = await authenticate.webhook(request);

    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Shop:", shop);
    console.log("Topic:", topic);
    console.log("Payload:", payload);

    const { status, admin_graphql_api_id, type } = payload;

    if (type !== "query") return new Response();

    if (status !== "completed") {
        console.log(`Bulk operation ${payload.admin_graphql_api_id} failed or was canceled.`);
        return new Response();
    }

    const rule = await db.rule.findFirst({
        where: {
            shop,
            lastBulkOperationId: admin_graphql_api_id,
        }
    })

    if (!rule) {
        console.error("No matching rule found for this Bulk Operation ID!");
        return new Response();
    }

    const jobId = topic.toLowerCase() + admin_graphql_api_id.replace(":", "");

    await bulkProcessingQueue.add(
        "process-bulk-result",
        {
            bulkOperationId: admin_graphql_api_id,
            shop: shop,
            ruleId: rule.id,
        },
        {
            jobId,
            removeOnComplete: true,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
        }
    );

    return new Response();
};