import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getTaggedProductsData, getRulesData } from "../models/chart-data.modal";
import TaggedProductsChart from "../components/tags-chart";
import AppliedRulesImpactChart from "../components/rules-chart";
import ChartLoader from "../components/loader";
import { useLoaderData, Await } from "react-router";
import { getSuccessRate } from "../utils";
import { Suspense } from "react";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    const [activeRulesCount, todayTags, stats] = await Promise.all([
        db.rule.count({ where: { shop, isActive: true } }),
        db.webhooklog.count({
            where: {
                shop,
                status: 'SUCCESS',
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
        }),
        db.webhooklog.groupBy({
            by: ['status'],
            where: {
                shop,
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
            _count: {
                status: true,
            },
        })
    ]);

    return {
        activeRulesCount,
        todayTags,
        stats,
        taggedProductsData: getTaggedProductsData(shop),
        highRulesData: getRulesData(shop)
    };
};

export default function Analytics() {

    const { activeRulesCount, todayTags, stats, taggedProductsData, highRulesData } = useLoaderData();
    const successRate = getSuccessRate(stats);

    return (
        <s-page heading="Analytics">
            <s-section padding="base">
                <s-stack gap="large">
                    <s-grid
                        gridTemplateColumns="@container (inline-size <= 400px) 1fr, 1fr auto 1fr auto 1fr"
                        gap="small"
                    >
                        <s-clickable
                            href=""
                            paddingBlock="small-400"
                            paddingInline="small-100"
                            borderRadius="base"
                        >
                            <s-grid gap="small-300">
                                <s-heading>Total Active Rules</s-heading>
                                <s-stack direction="inline" gap="small-200">
                                    <s-text>{activeRulesCount}</s-text>
                                </s-stack>
                            </s-grid>
                        </s-clickable>
                        <s-divider direction="block" />
                        <s-clickable
                            href=""
                            paddingBlock="small-400"
                            paddingInline="small-100"
                            borderRadius="base"
                        >
                            <s-grid gap="small-300">
                                <s-heading>Products Tagged {"("}Today{")"}</s-heading>
                                <s-stack direction="inline" gap="small-200">
                                    <s-text>{todayTags}</s-text>
                                </s-stack>
                            </s-grid>
                        </s-clickable>
                        <s-divider direction="block" />
                        <s-clickable
                            href=""
                            paddingBlock="small-400"
                            paddingInline="small-100"
                            borderRadius="base"
                        >
                            <s-grid gap="small-300">
                                <s-heading>Success Rate</s-heading>
                                <s-stack direction="inline" gap="small-200">
                                    <s-text>{successRate} %</s-text>
                                </s-stack>
                            </s-grid>
                        </s-clickable>
                    </s-grid>
                    <s-divider></s-divider>
                    <s-box padding="base" background="subdued" borderRadius="large">
                        <Suspense fallback={<ChartLoader />}>
                            <Await resolve={taggedProductsData}>
                                {(data) => <TaggedProductsChart data={data} />}
                            </Await>
                        </Suspense>
                    </s-box>
                    <s-divider></s-divider>
                    <s-box padding="base" background="subdued" borderRadius="large">
                        <Suspense fallback={<ChartLoader />}>
                            <Await resolve={highRulesData}>
                                {(data) => <AppliedRulesImpactChart data={data} />}
                            </Await>
                        </Suspense>
                    </s-box>
                </s-stack>
            </s-section>
        </s-page>
    )
}


export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};
