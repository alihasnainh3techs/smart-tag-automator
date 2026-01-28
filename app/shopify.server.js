import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import redis from "./redis";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  webhooks: {
    BULK_OPERATIONS_FINISH: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/bulk_operations_finish",
    },
    PRODUCTS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/products_create",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });

      const { shop } = session;

      const defaultSettings = {
        shop: shop,
        tagPrefix: "auto-",
        appStatus: true,
      };

      const setting = await prisma.setting.upsert({
        where: { shop: shop },
        update: {},
        create: defaultSettings,
      });

      await redis.set(`settings:${shop}`, JSON.stringify(setting));

    }
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
