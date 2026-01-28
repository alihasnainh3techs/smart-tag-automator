import db from "../db.server";
import redis from "../redis";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getSetting } from "../models/setting.server";
import { useEffect, useState } from "react";
import { useLoaderData, useLocation, useNavigate, useNavigation, useSearchParams, useSubmit } from "react-router";

export const loader = async ({ request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    return await getSetting(shop);
};

export async function action({ request }) {

    const { session, redirect } = await authenticate.admin(request);
    const { shop } = session;

    const formData = await request.formData();

    const data = {
        tagPrefix: formData.get("tagPrefix"),
        appStatus: formData.get("appStatus") === "true",
        shop,
    };

    const updatedSetting = await db.setting.upsert({
        where: { shop: shop },
        create: data,
        update: data,
    })

    await redis.set(`settings:${shop}`, JSON.stringify(updatedSetting));

    return redirect("/app/setting?status=saved");
}

export default function Setting() {

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const setting = useLoaderData();

    const [initialFormState, setInitialFormState] = useState(setting);
    const [formState, setFormState] = useState(setting);

    const isSaving = useNavigation().state === "submitting";
    const isDirty =
        JSON.stringify(formState) !== JSON.stringify(initialFormState);
    const submit = useSubmit();

    function handleSave(e) {
        e.preventDefault();

        const data = {
            tagPrefix: formState.tagPrefix,
            appStatus: formState.appStatus,
        };

        submit(data, { method: "post" });
    }

    function handleReset() {
        setFormState(initialFormState);
    }

    useEffect(() => {
        const saveBar = document.getElementById("setting-save-bar");
        isDirty ? saveBar.show() : saveBar.hide();
    }, [isDirty]);

    useEffect(() => {
        const status = searchParams.get("status");

        if (!status) return;

        if (status === "saved") {
            window.shopify.toast.show("Setting saved", { duration: 3000 });
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
        setInitialFormState(setting);
        setFormState(setting);
    }, [setting]);

    return (
        <form onSubmit={handleSave}>
            <ui-save-bar id="setting-save-bar">
                <button variant="primary" disabled={isSaving} loading={isSaving ? "" : false} type="submit"></button>
                <button disabled={isSaving} onClick={handleReset} type="button"></button>
            </ui-save-bar>
            <s-page heading="Settings">
                <s-section>
                    <s-stack gap="base">
                        <s-switch
                            label="App Automation Status"
                            details="Turn this on to allow the app to monitor product changes and apply tags automatically. When off, all automation is paused."
                            checked={formState.appStatus}
                            onChange={(e) =>
                                setFormState({ ...formState, appStatus: e.currentTarget.checked })
                            }
                        />
                        <s-divider />
                        <s-text-field
                            label="Tag Prefix"
                            placeholder="e.g. auto-"
                            autocomplete="off"
                            details="This will be added to the start of every tag created by the app (e.g., auto-summer-sale)."
                            value={formState.tagPrefix}
                            onInput={(e) =>
                                setFormState({ ...formState, tagPrefix: e.currentTarget.value })
                            }
                        />
                    </s-stack>
                </s-section>
            </s-page>
        </form>
    )
}

export const headers = (headersArgs) => {
    return boundary.headers(headersArgs);
};