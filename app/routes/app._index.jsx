/* eslint-disable react/prop-types */
import { useDebouncedCallback } from "use-debounce";
import db from "../db.server";
import { tagsQueue } from "../queues";
import { getLogicSummary, truncate, formatDate } from "../utils";
import { getRules } from "../models/rules.modal";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import DeleteRuleModal from "../components/delete-rule-modal";
import RunRuleModal from "../components/run-rule-modal";
import EmptyState from "../components/empty-state";
import { useActionData, useFetcher, useLoaderData, useLocation, useNavigate, useSearchParams } from "react-router";
import RuleProvider, { useRuleContext } from "../contexts/rules.context";
import { useEffect } from "react";

const emptyState = {
  title: "No product tagging rules yet",
  text: "Create rules to automatically tag products based on conditions such as price, vendor, or inventory level.",
  label: "Create product rule",
  link: "/app/rules/new",
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  const query = url.searchParams.get("query") ?? "";

  const paginationData = await getRules(shop, page, query);

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

  if (data.action === "run") {
    const setting = await db.setting.findUnique({ where: { shop } });
    if (!setting.appStatus) return redirect("/app");

    // 3. Add job to queue
    await tagsQueue.add(
      "run-rule-sync",
      {
        ruleId: Number(data.id),
        shop: shop
      },
      {
        jobId: `rule-${data.id}`,
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );

    return redirect(`/app?status=success`);
  }

  if (data.action === "delete") {
    await db.rule.delete({ where: { shop, id: Number(data.id) } });
  }

  return redirect("/app");
}

const RulesTable = () => {
  const { items, hasNextPage, hasPreviousPage, totalCount, currentPage } = useLoaderData();

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fetcher = useFetcher();

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

  useEffect(() => {
    fetcher.load("/api/setting");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setting = fetcher.data;

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
        <s-table loading={fetcher.state === "loading"} paginate={totalCount > 10} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} onNextPage={() => handlePaginate(currentPage + 1)} onPreviousPage={() => handlePaginate(currentPage - 1)}>
          <s-table-header-row>
            <s-table-header listSlot="primary">Rule Name</s-table-header>
            <s-table-header>Status</s-table-header>
            <s-table-header>Logic Summary</s-table-header>
            <s-table-header>Tags to Apply</s-table-header>
            <s-table-header format="numeric">Products Tagged</s-table-header>
            <s-table-header>Last Updated</s-table-header>
            <s-table-header>Actions</s-table-header>
          </s-table-header-row>

          <s-table-body>
            {items.map((rule) => (
              <RulesTableRow key={rule.id} rule={rule} setting={setting} />
            ))}
          </s-table-body>
        </s-table>
      </div>
    </div>
  )
}

const RulesTableRow = ({ rule, setting }) => {
  const { setRule } = useRuleContext();

  return (
    <s-table-row id={rule.id} clickDelegate={`/app/rules/${rule.id}`}>
      <s-table-cell>
        <s-link title={rule.ruleName} href={`/app/rules/${rule.id}`}>
          {truncate(rule.ruleName)}
        </s-link>
      </s-table-cell>
      <s-table-cell>
        {rule.isActive ? (
          <s-badge tone="success">Active</s-badge>
        ) : (
          <s-badge tone="info">Inactive</s-badge>
        )}
      </s-table-cell>
      <s-table-cell>
        {getLogicSummary(rule.conditions)}
      </s-table-cell>
      <s-table-cell>
        <div className="d-flex gap-1 flex-wrap" style={{ maxWidth: "150px" }}>
          {JSON.parse(rule.tags).map((tag) => (
            <s-chip key={tag}>{tag}</s-chip>
          ))}
        </div>
      </s-table-cell>
      <s-table-cell>{rule.totalAppliedCount}</s-table-cell>
      <s-table-cell>
        {rule.lastRunAt ? (
          <s-text>
            {formatDate(rule.lastRunAt)}
          </s-text>
        ) : (
          <s-text>-</s-text>
        )}
      </s-table-cell>
      <s-table-cell>
        <div className="d-flex gap-1">
          <s-tooltip id="delete-tooltip">Delete Rule</s-tooltip>
          <s-button icon="delete" variant="secondary" tone="critical" commandFor="delete-rule-modal" interestFor="delete-tooltip" accessibilityLabel="Delete Rule" onClick={() => setRule(rule)}></s-button>
          <s-tooltip id="run-tooltip">
            {setting?.appStatus ? (
              "Run Now"
            ) : (
              "Enable the app to run rules"
            )}
          </s-tooltip>
          <s-button disabled={!setting?.appStatus} icon="refresh" variant="secondary" commandFor="run-rule-modal" interestFor="run-tooltip" accessibilityLabel="Run Now" onClick={() => setRule(rule)}></s-button>
        </div>
      </s-table-cell>
    </s-table-row>
  )
}

export default function Index() {

  const { totalCount } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const errors = useActionData()?.errors || {};

  useEffect(() => {
    if (errors) {
      window.shopify.toast.show(errors.message, { isError: true, duration: 3000 });
    }
  }, [errors]);

  useEffect(() => {
    const status = searchParams.get("status");

    if (!status) return;

    if (status === "success") {
      window.shopify.toast.show("Sync started! Your products are being updated.", { duration: 3000 });
    }

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("status");
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );
  }, [searchParams, navigate, location]);

  return (
    <RuleProvider>
      <s-page heading="Home">
        <s-button slot="secondary-actions" href="/app/rules/new">
          Create Product Rule
        </s-button>
        <s-section>
          {totalCount === 0 ? (
            <EmptyState
              title={emptyState.title}
              text={emptyState.text}
              label={emptyState.label}
              link={emptyState.link}
            />
          ) : (
            <RulesTable />
          )}
        </s-section>
      </s-page>
      <RunRuleModal />
      <DeleteRuleModal />
    </RuleProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
