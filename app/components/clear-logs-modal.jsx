import { useEffect } from "react";
import { useNavigation, useSubmit } from "react-router";

// eslint-disable-next-line react/prop-types
export default function ClearLogsModal({ message = "" }) {

    const submit = useSubmit();
    const isSaving = useNavigation().state === "submitting";

    function handleClearLogs() {
        submit({ action: "clear" }, { method: "post" });
    }

    useEffect(() => {
        if (!isSaving) {
            const modal = document.getElementById(
                "clear-logs-modal",
            )
            modal?.hideOverlay?.();
        }
    }, [isSaving]);

    return (
        <s-modal id="clear-logs-modal" heading="Clear Logs">

            <s-stack gap="base">
                <s-text>{message}</s-text>
                <s-text tone="caution">This action cannot be undone.</s-text>
            </s-stack>

            <s-button slot="secondary-actions" commandFor="clear-logs-modal" command="--hide">
                Close
            </s-button>
            <s-button
                slot="primary-action"
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
                onClick={handleClearLogs}
                tone="critical"
            >
                Clear Logs
            </s-button>
        </s-modal>
    )
}