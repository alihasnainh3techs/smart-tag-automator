import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useEffect, useRef, useState } from "react";
import { getRule, validateRule } from "../models/rules.modal";
import db from "../db.server";
import { filterConditions } from "../utils";
import { useActionData, useLoaderData, useLocation, useNavigate, useNavigation, useParams, useSearchParams, useSubmit } from "react-router";

const DEFAULT_DATA = {
    ruleName: "",
    isActive: true,
    taggingBehavior: "ADD",
    autoRemoveTags: false,
    matchType: "AND",
    conditions: [
        { id: crypto.randomUUID(), attribute: "product-title", operator: "contains", value: "" }
    ],
    tags: [],
}

export const loader = async ({ request, params }) => {
    await authenticate.admin(request);

    if (params.id === "new") return DEFAULT_DATA;

    const rule = await getRule(Number(params.id));
    return {
        ...rule,
        conditions: JSON.parse(rule.conditions),
        tags: JSON.parse(rule.tags),
    }

};

export async function action({ request, params }) {
    const { session, redirect } = await authenticate.admin(request);
    const { shop } = session;


    const formData = await request.formData();

    const data = {
        ...Object.fromEntries(formData),
        isActive: formData.get("isActive") === "true",
        autoRemoveTags: formData.get("autoRemoveTags") === "true",
        shop,
    };

    if (data.action === "delete") {
        await db.rule.delete({ where: { id: Number(params.id) } });
        return redirect("/app");
    }

    const errors = validateRule(data);

    if (errors) {
        return new Response(JSON.stringify({ errors }), {
            status: 422,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    const rule =
        params.id === "new"
            ? await db.rule.create({ data: { ...data, conditions: filterConditions(data.conditions) } })
            : await db.rule.update({ where: { id: Number(params.id) }, data: { ...data, conditions: filterConditions(data.conditions) } });

    return redirect(`/app/rules/${rule.id}${params.id === "new" ? "?status=created" : "?status=saved"}`);
}

export default function RuleForm() {

    const tagInputRef = useRef(null);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const rule = useLoaderData();
    const [initialFormState, setInitialFormState] = useState(rule);
    const [formState, setFormState] = useState(rule);
    const [tag, setTag] = useState("");

    const errors = useActionData()?.errors || {};
    const isSaving = useNavigation().state === "submitting";
    const isDirty = JSON.stringify(formState) !== JSON.stringify(initialFormState);

    const submit = useSubmit();

    function handleSave(e) {
        e.preventDefault();

        const data = {
            ruleName: formState.ruleName,
            isActive: formState.isActive,
            taggingBehavior: formState.taggingBehavior,
            autoRemoveTags: formState.autoRemoveTags,
            matchType: formState.matchType,
            conditions: JSON.stringify(formState.conditions),
            tags: JSON.stringify(formState.tags),
        }

        submit(data, { method: "post" });
    }

    function handleDelete() {
        submit({ action: "delete" }, { method: "post" });
    }

    function handleReset() {
        setFormState(initialFormState);
    }

    useEffect(() => {
        const saveBar = document.getElementById("rule-save-bar");
        isDirty ? saveBar.show() : saveBar.hide();
    }, [isDirty]);

    useEffect(() => {
        const status = searchParams.get("status");

        if (!status) return;

        if (status === "created") {
            window.shopify.toast.show("Rule created successfully", { duration: 3000 });
        } else if (status === "saved") {
            window.shopify.toast.show("Rule updated", { duration: 3000 });
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

    useEffect(() => {
        setInitialFormState(rule);
        setFormState(rule);
    }, [id, rule]);

    const operatorGroups = {
        text: [
            { label: "Contains", value: "contains" },
            { label: "Does not contain", value: "does-not-contains" },
            { label: "Starts with", value: "starts-with" },
            { label: "Ends with", value: "ends-with" },
            { label: "Equals", value: "equals" },
        ],
        numeric: [
            { label: "Greater than", value: "greater-than" },
            { label: "Less than", value: "less-than" },
            { label: "Equals", value: "equals" },
        ],
        common: [
            { label: "Is empty", value: "is-empty" },
            { label: "Is not empty", value: "is-not-empty" },
        ]
    };

    const getFilteredOperators = (attribute) => {
        const isNumeric = ["price", "inventory-total"].includes(attribute);
        const specificOps = isNumeric ? operatorGroups.numeric : operatorGroups.text;
        return [...specificOps, ...operatorGroups.common];
    };

    const addCondition = () => {
        setFormState(prev => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                { id: crypto.randomUUID(), attribute: "product-title", operator: "contains", value: "" }
            ]
        }));
    };

    const removeCondition = (id) => {
        if (formState.conditions.length <= 1) return;
        setFormState(prev => ({
            ...prev,
            conditions: prev.conditions.filter(c => c.id !== id)
        }));
    };

    const updateCondition = (id, field, value) => {
        setFormState(prev => ({
            ...prev,
            conditions: prev.conditions.map(c => {
                if (c.id === id) {
                    const updated = { ...c, [field]: value };
                    if (field === "attribute") {
                        const validOps = getFilteredOperators(value);
                        if (!validOps.find(o => o.value === c.operator)) {
                            updated.operator = validOps[0].value;
                        }
                    }
                    return updated;
                }
                return c;
            })
        }));
    };

    function handleTagRemove(tagToRemove) {
        setFormState(prev => ({
            ...prev,
            tags: prev.tags.filter((value) => value !== tagToRemove)
        }));
    }

    function handleMatchChange(e) {
        const value = e.currentTarget.values[0];
        setFormState(prev => ({ ...prev, matchType: value }));
    }

    function handleModeChange(e) {
        const value = e.currentTarget.values[0];
        setFormState(prev => ({ ...prev, taggingBehavior: value }));
    }

    function handleStatusChange(e) {
        const value = e.currentTarget.value;
        setFormState(prev => ({ ...prev, isActive: value === "1" }));
    }

    function handleAutoRemove(e) {
        const value = e.currentTarget.checked;
        setFormState(prev => ({ ...prev, autoRemoveTags: value }));
    }

    useEffect(() => {
        const input = tagInputRef.current;
        if (!input) return;
        const handleKeyUp = (e) => {
            if (e.key !== "Enter" || !tag || formState.tags.includes(tag)) return;
            setFormState(prev => ({ ...prev, tags: [...prev.tags, tag] }));
            setTag("");
        };
        input.addEventListener("keyup", handleKeyUp);
        return () => input.removeEventListener("keyup", handleKeyUp);
    }, [tag, formState.tags]);

    return (
        <form onSubmit={handleSave}>
            <ui-save-bar id="rule-save-bar">
                <button variant="primary" disabled={isSaving} loading={isSaving ? "" : false} type="submit"></button>
                <button disabled={isSaving} onClick={handleReset} type="button"></button>
            </ui-save-bar>
            <s-page heading={initialFormState.id ? "Edit Rule" : "Create Rule"}>
                <s-link
                    href="/app"
                    slot="breadcrumb-actions"
                    onClick={(e) => (isDirty ? e.preventDefault() : navigate("/app"))}
                >
                    Home
                </s-link>
                {initialFormState.id &&
                    <s-button slot="secondary-actions" onClick={handleDelete}>Delete</s-button>}
                <s-section>
                    <s-stack gap="base">

                        <div className="d-flex gap-3">
                            <s-text-field
                                label="Rule Name"
                                value={formState.ruleName}
                                error={errors.ruleName}
                                onInput={(e) => setFormState({ ...formState, ruleName: e.currentTarget.value })}
                                placeholder="e.g. High price products"
                                required
                                autocomplete="off"
                            />
                            <s-select
                                label="Status"
                                value={formState.isActive ? "1" : "0"}
                                onChange={handleStatusChange}
                            >
                                <s-option value="1" selected={formState.isActive === true}>Active</s-option>
                                <s-option value="0" selected={formState.isActive === false}>Inactive</s-option>
                            </s-select>

                        </div>

                        <s-divider></s-divider>

                        <s-choice-list
                            label="Tagging behavior"
                            onChange={handleModeChange}
                        >
                            <s-choice value="ADD" selected={formState.taggingBehavior === "ADD"}>
                                Add tags
                            </s-choice>

                            <s-choice value="REPLACE" selected={formState.taggingBehavior === "REPLACE"}>
                                Replace tags
                            </s-choice>
                        </s-choice-list>

                        <s-choice-list label="Match product that fit:" onChange={handleMatchChange}>
                            <s-choice value="AND" selected={formState.matchType === "AND"}>All conditions (AND)</s-choice>
                            <s-choice value="OR" selected={formState.matchType === "OR"}>Any condition (OR)</s-choice>
                        </s-choice-list>

                        <s-checkbox
                            checked={formState.autoRemoveTags}
                            onChange={handleAutoRemove}
                            label="Auto remove tags"
                            details="Remove tags if conditions are no longer met."
                        />

                        <s-divider></s-divider>

                        {/* Dynamic Conditions Mapping */}
                        <s-stack gap="small">
                            <s-text>Conditions</s-text>
                            {formState.conditions.map((condition) => (
                                <div key={condition.id} className="condition">
                                    <s-select
                                        label="Attribute"
                                        value={condition.attribute}
                                        onChange={(e) => updateCondition(condition.id, "attribute", e.currentTarget.value)}
                                    >
                                        <s-option value="product-title">Product Title</s-option>
                                        <s-option value="price">Price</s-option>
                                        <s-option value="inventory-total">Inventory Total</s-option>
                                        <s-option value="product-type">Product Type</s-option>
                                        <s-option value="vendor">Vendor</s-option>
                                    </s-select>

                                    <s-select
                                        label="Operator"
                                        value={condition.operator}
                                        onChange={(e) => updateCondition(condition.id, "operator", e.currentTarget.value)}
                                    >
                                        {getFilteredOperators(condition.attribute).map(op => (
                                            <s-option key={op.value} value={op.value}>{op.label}</s-option>
                                        ))}
                                    </s-select>

                                    <s-text-field
                                        label="Value"
                                        value={condition.value}
                                        error={errors.conditions?.[condition.id]}
                                        onInput={(e) => updateCondition(condition.id, "value", e.currentTarget.value)}
                                        autocomplete="off"
                                        disabled={condition.operator.includes("empty")}
                                    />

                                    {/* Only show delete if there is more than one condition */}
                                    {formState.conditions.length > 1 && (
                                        <div className={`${errors.conditions?.[condition.id] ? "align-items-center" : "align-items-end pb-4px"}`} style={{ display: "flex" }}>
                                            <s-button
                                                accessibilityLabel="Delete Row"
                                                variant="tertiary"
                                                tone="critical"
                                                icon="delete"
                                                onClick={() => removeCondition(condition.id)}
                                            ></s-button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </s-stack>

                        <s-button variant="secondary" onClick={addCondition}>Add another condition</s-button>

                        <s-divider></s-divider>

                        <s-text-field
                            ref={tagInputRef}
                            label="Apply Tags"
                            value={tag}
                            error={errors.tags}
                            required
                            autocomplete="off"
                            onInput={(e) => setTag(e.currentTarget.value)}
                            details="Press Enter to add tags"
                        />
                        <s-stack direction="inline" gap="small">
                            {formState.tags.map((t) => (
                                <s-clickable-chip key={t} onRemove={() => handleTagRemove(t)} removable>{t}</s-clickable-chip>
                            ))}
                        </s-stack>
                    </s-stack>
                </s-section>
            </s-page>
        </form>
    );
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};