/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/prop-types */
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import EmptyState from "../components/empty-state";
import db from "../db.server";
import { getProductsRulesLogs } from "../models/logs.modal";
import ClearLogsModal from "../components/clear-logs-modal";
import { truncate, formatDate } from "../utils";
import { useLoaderData, useLocation, useNavigate, useSearchParams, useSubmit } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { createContext, useContext, useEffect, useState } from "react";

const emptyState = {
    title: "No activity logs yet",
    text: "Activity logs will appear here once product tagging rules have been executed.",
}

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const query = url.searchParams.get("query") ?? "";

    const paginationData = await getProductsRulesLogs(shop, page, query);

    return {
        ...paginationData,
        currentPage: page,
    };
};

export async function action({ request }) {
    const { session, redirect } = await authenticate.admin(request);
    const { shop } = session;

    const data = {
        ...Object.fromEntries(await request.formData()),
        shop,
    };

    if (data.action === "clear") {
        await db.activitylog.deleteMany({
            where: {
                shop: shop
            }
        });
    }

    if (data.action === "delete") {
        await db.activitylog.deleteMany({
            where: {
                shop: shop,
                id: {
                    in: JSON.parse(data.ids),
                },
            }
        });
    }

    return redirect("/app/activity-logs");
}

const LogsContext = createContext(null);

const LogsTable = () => {
    const { logs, hasNextPage, hasPreviousPage, totalCount, currentPage } = useLoaderData();

    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    const { selectedIds, handleBulkDelete } = useContext(LogsContext);

    const handleSearch = useDebouncedCallback((term) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        navigate(
            {
                pathname: location.pathname,
                search: params.toString(),
            },
            { replace: true }
        );
    }, 300);

    function handlePaginate(newPage) {
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString())
        navigate({
            pathname: location.pathname,
            search: params.toString(),
        })
    }

    return (
        <div className="table-container">
            <div style={{ padding: "4px" }}>
                <s-grid padding="none none small none" slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
                    <div className="search-container">
                        <s-text-field
                            onInput={(e) => handleSearch(e.target.value)}
                            defaultValue={searchParams.get("query")?.toString()}
                            autocomplete="off"
                            label="Search by rule name"
                            labelAccessibilityVisibility="exclusive"
                            icon="search"
                            placeholder="Search by rule name"
                        />
                    </div>
                </s-grid>
            </div>
            <div className="table">
                {selectedIds.length > 0 ? (
                    <s-stack background="subdued">
                        <div style={{ padding: "5px 5px 5px 12px" }}>
                            <s-stack direction="inline" gap="small">
                                <s-text>{selectedIds.length} selected</s-text>
                                <span tabIndex={0} role="button" onClick={handleBulkDelete} className="cursor-pointer">
                                    <s-badge tone="critical" icon="delete">Delete logs</s-badge>
                                </span>
                            </s-stack>
                        </div>
                    </s-stack>
                ) : null}
                <s-table paginate={totalCount > 10} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} onNextPage={() => handlePaginate(currentPage + 1)} onPreviousPage={() => handlePaginate(currentPage - 1)}>
                    {selectedIds.length === 0 ? (
                        <s-table-header-row>
                            <s-table-header listSlot="primary">Rule</s-table-header>
                            <s-table-header format="numeric">Products Updated</s-table-header>
                            <s-table-header>Status</s-table-header>
                            <s-table-header>Reason</s-table-header>
                            <s-table-header>Time</s-table-header>
                        </s-table-header-row>
                    ) : null}

                    <s-table-body>
                        {logs.map((log) => (
                            <LogsTableRow key={log.id} log={log} />
                        ))}
                    </s-table-body>
                </s-table>
            </div>
        </div>
    )
}

const LogsTableRow = ({ log }) => {

    const { handleRowCheckboxChange } = useContext(LogsContext);

    return (
        <s-table-row id={log.id} clickDelegate={`log-${log.id}`}>
            <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                    <s-checkbox id={`log-${log.id}`} value={log.id} onChange={handleRowCheckboxChange} />
                    {log.rule ? (
                        <s-link title={log.rule.ruleName} href={`/app/rules/${log.rule.id}`}>
                            {truncate(log.rule.ruleName)}
                        </s-link>
                    ) : (
                        <s-badge icon="alert-diamond" tone="critical">
                            Rule has been deleted
                        </s-badge>
                    )}
                </s-stack>
            </s-table-cell>
            <s-table-cell>{log.productsUpdated}</s-table-cell>
            <s-table-cell>
                {log.status === "SUCCESS" ? (
                    <s-badge tone="success">Success</s-badge>
                ) : (
                    <s-badge tone="critical">Failed</s-badge>
                )}
            </s-table-cell>
            <s-table-cell>
                {log.reason ? (
                    <s-text title={log.reason}>{truncate(log.reason)}</s-text>
                ) : (
                    <s-text>-</s-text>
                )}
            </s-table-cell>
            <s-table-cell>
                {formatDate(log.createdAt)}
            </s-table-cell>
        </s-table-row>
    )
}

export default function ActivityLogs() {
    const { totalCount } = useLoaderData();

    const submit = useSubmit();

    const [selectedIds, setSelectedIds] = useState([]);

    const handleRowCheckboxChange = (event) => {
        const { checked, value } = event.target;

        const valueNum = +value;

        setSelectedIds((prev) => {
            if (checked) {
                if (prev.includes(valueNum)) return prev;
                return [...prev, valueNum];
            }

            return prev.filter((id) => id !== valueNum);
        });
    };

    const handleBulkDelete = () => {
        submit({
            action: "delete",
            ids: JSON.stringify(selectedIds),
        }, { method: "post" });
    }

    useEffect(() => {
        setSelectedIds([]);
    }, [totalCount])

    return (
        <LogsContext.Provider value={{ selectedIds, handleRowCheckboxChange, handleBulkDelete }}>
            <s-page heading="Activity Logs">
                <s-button disabled={totalCount === 0} slot="secondary-actions" commandFor="clear-logs-modal">
                    Clear Logs
                </s-button>
                <s-section>
                    {totalCount === 0 ? (
                        <EmptyState
                            title={emptyState.title}
                            text={emptyState.text}
                        />
                    ) : (
                        <LogsTable />
                    )}
                </s-section>
            </s-page>
            <ClearLogsModal message={"Are you sure you want to clear all product activity logs?"} />
        </LogsContext.Provider>
    )
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};