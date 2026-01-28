import { isToday, isThisYear, format } from "date-fns";

export function filterConditions(conditions) {
    const conditionArray = JSON.parse(conditions);

    const filteredConditions = conditionArray.filter((val, index, self) =>
        index === self.findIndex(t =>
            t.attribute === val.attribute &&
            t.operator === val.operator &&
            t.value === val.value
        )
    );

    return JSON.stringify(filteredConditions);
}


export function getLogicSummary(conditionsJson) {
    // 1. Parse conditions if they are still a string
    const conditions = typeof conditionsJson === 'string'
        ? JSON.parse(conditionsJson)
        : conditionsJson;

    if (!conditions || conditions.length === 0) return "No conditions";

    // 2. Define friendly mappings for attributes and operators
    const attrMap = {
        "product-title": "Title",
        "price": "Price",
        "inventory-total": "Inventory",
        "product-type": "Type",
        "vendor": "Vendor"
    };

    const opMap = {
        "contains": "contains",
        "does-not-contains": "not containing",
        "starts-with": "starts with",
        "ends-with": "ends with",
        "equals": "is",
        "greater-than": ">",
        "less-than": "<",
        "is-empty": "is empty",
        "is-not-empty": "is not empty"
    };

    // 3. Format the first condition
    const first = conditions[0];
    const attr = attrMap[first.attribute] || first.attribute;
    const op = opMap[first.operator] || first.operator;

    // Handle operators that don't need a value (is-empty, etc.)
    let summary = first.operator.includes("empty")
        ? `${attr} ${op}`
        : `${attr} ${op} '${first.value}'`;

    // 4. Add the "+ X more" count if applicable
    if (conditions.length > 1) {
        summary += ` + ${conditions.length - 1} more`;
    }

    return summary;
}

export function truncate(str, { length = 50 } = {}) {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.slice(0, length) + "…";
}

export function formatDate(date) {
    const d = new Date(date);

    if (isToday(d)) {
        return format(d, "hh:mm a");
    }

    if (isThisYear(d)) {
        return format(d, "hh:mm a dd MMM");
    }

    return format(d, "hh:mm a dd MMM yyyy");
}