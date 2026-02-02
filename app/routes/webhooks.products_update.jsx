import { authenticate } from "../shopify.server";
import redis from "../redis";
import db from "../db.server";
import { productUpdatedTagUpdateQueue } from "../queues";

export const action = async ({ request }) => {
    const { shop, topic, payload } = await authenticate.webhook(request);

    console.log("=== WEBHOOK RECEIVED ===");
    console.log("Shop:", shop);
    console.log("Topic:", topic);
    console.log("Payload:", payload);

    const { admin_graphql_api_id, } = payload;

    const itemId = admin_graphql_api_id.split("/").pop();

    const settingsKey = `settings:${shop}`;
    const lockKey = `webhook_lock:${shop}:${itemId}`;
    const createdKey = `just_created:${shop}:${itemId}`;

    const [cachedSetting, isLocked, isJustCreated] = await redis.mget([
        settingsKey,
        lockKey,
        createdKey
    ]);

    let settings;
    if (!cachedSetting) {
        settings = await db.setting.findUnique({ where: { shop } });
        await redis.set(`settings:${shop}`, JSON.stringify(settings));

    } else {
        settings = JSON.parse(cachedSetting);
    }

    if (!settings?.appStatus) return new Response();

    if (isLocked || isJustCreated) return new Response();

    const jobId = topic.toLowerCase() + admin_graphql_api_id.replace(":", "");

    await productUpdatedTagUpdateQueue.add("product-updated-auto-tag", {
        admin_graphql_api_id,
        shop,
    }, {
        jobId,
        removeOnComplete: true,
        removeOnFail: { age: 24 * 3600 }
    });

    return new Response();
};