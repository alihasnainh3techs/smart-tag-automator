import redis from "./redis";
import { Queue } from "bullmq";

export const tagsQueue = new Queue("tags-queue", {
    connection: redis,
});

export const bulkProcessingQueue = new Queue("bulk-processing-queue", {
    connection: redis,
});

export const productCreatedTagUpdateQueue = new Queue("product-created-tag-update-queue", {
    connection: redis,
});

export const productUpdatedTagUpdateQueue = new Queue("product-updated-tag-update-queue", {
    connection: redis,
});