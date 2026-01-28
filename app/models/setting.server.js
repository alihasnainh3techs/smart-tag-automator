import db from "../db.server";

export async function getSetting(shop) {
    return await db.setting.findUnique({
        where: { shop }
    });
}