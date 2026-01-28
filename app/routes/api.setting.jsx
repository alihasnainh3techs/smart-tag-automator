import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    return await db.setting.findUnique({
        where: { shop }
    });
};

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
