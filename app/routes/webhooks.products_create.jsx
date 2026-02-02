import { authenticate } from "../shopify.server";
import db from "../db.server";
import redis from "../redis";
import { productCreatedTagUpdateQueue } from "../queues";

export const action = async ({ request }) => {
    const { shop, topic, payload } = await authenticate.webhook(request);

    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Shop:", shop);
    console.log("Topic:", topic);
    console.log("Payload:", payload);

    const cachedSetting = await redis.get(`settings:${shop}`);
    let settings;

    if (!cachedSetting) {
        settings = await db.setting.findUnique({ where: { shop } });
        await redis.set(`settings:${shop}`, JSON.stringify(settings));

    } else {
        settings = JSON.parse(cachedSetting);
    }

    if (!settings?.appStatus) return new Response();

    const { admin_graphql_api_id, } = payload;

    const productId = topic.toLowerCase() + admin_graphql_api_id.replace(":", "");
    const itemId = admin_graphql_api_id.split("/").pop();

    await redis.set(`just_created:${shop}:${itemId}`, "true", "EX", 30);

    await productCreatedTagUpdateQueue.add("product-created-auto-tag", {
        admin_graphql_api_id,
        shop,
    }, {
        jobId: productId,
        removeOnComplete: true,
        removeOnFail: { age: 24 * 3600 }
    });

    return new Response();
};