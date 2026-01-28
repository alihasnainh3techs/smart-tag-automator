import { useEffect } from "react";
import { useRuleContext } from "../contexts/rules.context";

export default function DeleteRuleModal() {

    const { selectedRule, handleDelete, isSaving } = useRuleContext();

    useEffect(() => {
        if (!isSaving) {
            const modal = document.getElementById(
                "delete-rule-modal",
            )
            modal?.hideOverlay?.();
        }
    }, [isSaving]);

    return (
        <s-modal id="delete-rule-modal" heading="Delete Rule">

            <s-stack gap="base">
                <s-text>Are you sure you want to delete &quot;{selectedRule?.ruleName}&quot;?</s-text>
                <s-text tone="caution">This action cannot be undone.</s-text>
            </s-stack>

            <s-button slot="secondary-actions" commandFor="delete-rule-modal" command="--hide">
                Close
            </s-button>
            <s-button
                slot="primary-action"
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
                onClick={handleDelete}
                tone="critical"
            >
                Delete Rule
            </s-button>
        </s-modal>
    )
}