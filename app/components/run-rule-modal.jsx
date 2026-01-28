import { useEffect } from "react";
import { useRuleContext } from "../contexts/rules.context";

export default function RunRuleModal() {

    const { selectedRule, handleRole, isSaving } = useRuleContext();

    useEffect(() => {
        if (!isSaving) {
            const modal = document.getElementById(
                "run-rule-modal",
            )
            modal?.hideOverlay?.();
        }
    }, [isSaving]);

    return (
        <s-modal id="run-rule-modal" heading="Run rule on existing products">

            <s-stack gap="base">
                <s-text>
                    Are you sure you want to run &quot;{selectedRule?.ruleName}&quot;?
                </s-text>
                <s-text tone="warning">
                    This will process your existing catalog and apply tags based on your rule conditions.
                </s-text>
            </s-stack>

            <s-button slot="secondary-actions" commandFor="run-rule-modal" command="--hide">
                Close
            </s-button>
            <s-button
                slot="primary-action"
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
                onClick={handleRole}
            >
                Run Rule
            </s-button>
        </s-modal>
    )
}