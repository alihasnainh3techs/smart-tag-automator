/* eslint-disable react/prop-types */
import { createContext, useContext, useState } from "react";
import { useNavigation, useSubmit } from "react-router";

const RuleContext = createContext(null);

export default function RuleProvider({ children }) {
    const [selectedRule, setSelectedRule] = useState(null);
    const submit = useSubmit();
    const isSaving = useNavigation().state === "submitting";

    function setRule(rule) {
        setSelectedRule(rule);
    }

    function handleDelete() {
        if (!selectedRule) return;
        submit({ action: "delete", id: selectedRule.id }, { method: "post" });
    }

    function handleRole() {
        if (!selectedRule) return;
        submit({ action: "run", id: selectedRule.id }, { method: "post" });
    }

    return (
        <RuleContext.Provider value={{ selectedRule, setRule, handleDelete, handleRole, isSaving }}>
            {children}
        </RuleContext.Provider>
    );
}


export const useRuleContext = () => useContext(RuleContext);