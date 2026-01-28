import db from "../db.server";

const PAGE_SIZE = 10;

export async function getRule(id) {
    return await db.rule.findFirst({ where: { id } })
}

export async function getRules(shop, page = 1, query) {
    const skip = (page - 1) * PAGE_SIZE;

    const totalCount = await db.rule.count({
        where: { shop },
    });

    const rules = await db.rule.findMany({
        where: { shop, ruleName: { contains: query } },
        orderBy: { id: "desc" },
        take: PAGE_SIZE,
        skip: skip,
    });

    if (rules.length === 0) return {
        items: [],
        totalCount,
        hasNextPage: false,
        hasPreviousPage: false,
    };

    return {
        items: rules,
        totalCount,
        hasNextPage: totalCount > page * PAGE_SIZE,
        hasPreviousPage: page > 1,
    };
}

export function validateRule(data) {
    const errors = {};

    if (!data.ruleName) {
        errors.ruleName = "Rule name is required";
    }

    const tags = JSON.parse(data.tags);

    if (!tags.length) {
        errors.tags = "At least one tag is required";
    }

    const conditions = JSON.parse(data.conditions);

    // Conditions
    if (conditions) {
        const conditionErrors = {};

        for (const condition of conditions) {
            const { id, attribute, operator, value } = condition;

            // Skip value validation for empty operators
            if (operator === "is-empty" || operator === "is-not-empty") {
                continue;
            }

            // Numeric validation
            if (attribute === "price" || attribute === "inventory-total") {
                if (!value.trim()) {
                    conditionErrors[id] = "Value is required";
                    continue;
                }

                const num = Number(value);

                if (Number.isNaN(num)) {
                    conditionErrors[id] =
                        attribute === "price"
                            ? "Invalid price"
                            : "Invalid inventory value";
                    continue;
                }

                if (num < 0) {
                    conditionErrors[id] =
                        attribute === "price"
                            ? "Price cannot be less than zero"
                            : "Inventory cannot be less than zero";
                    continue;
                }

                // price validation
                if (attribute === "price" && !/^\d+(\.\d{1,2})?$/.test(value)) {
                    conditionErrors[id] = "Price must be a valid amount (max 2 decimals)";
                }

                // inventory validation
                if (attribute === "inventory-total" && !/^\d+$/.test(value)) {
                    conditionErrors[id] = "Inventory must be a whole number";
                }
            }

            // Text validation
            if (
                attribute === "vendor" ||
                attribute === "product-type" ||
                attribute === "product-title"
            ) {
                if (!value || !value.trim()) {
                    conditionErrors[id] = "Value cannot be empty";
                }
            }
        }

        if (Object.keys(conditionErrors).length) {
            errors.conditions = conditionErrors;
        }
    }

    if (Object.keys(errors).length) {
        return errors;
    }
}