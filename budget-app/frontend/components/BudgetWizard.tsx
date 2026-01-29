"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initializeBudget } from "../lib/api";
import { TemplateManager } from "./TemplateManager";

interface BudgetWizardProps {
    onClose: () => void;
    onBudgetCreated: (budgetId: string) => void;
}

export function BudgetWizard({ onClose, onBudgetCreated }: BudgetWizardProps) {
    const [step, setStep] = useState<"name" | "source">("name");
    const [budgetName, setBudgetName] = useState("");
    const [sourceType, setSourceType] = useState<"blank" | "template">("blank");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [resetQuantities, setResetQuantities] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCreate() {
        if (!budgetName) return;

        try {
            setIsCreating(true);
            setError(null);

            const result = await initializeBudget({
                name: budgetName,
                reset_quantities: resetQuantities,
                template_id: sourceType === "template" && selectedTemplateId ? selectedTemplateId : undefined
            });

            onBudgetCreated(result.budget_id);
        } catch (err) {
            setError("Failed to create budget. Please try again.");
            setIsCreating(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create New Budget</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {step === "name" ? "Step 1: Name your project" : "Step 2: Choose a starting point"}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        {step === "name" ? (
                            <motion.div
                                key="step-name"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Budget Name
                                    </label>
                                    <input
                                        type="text"
                                        value={budgetName}
                                        onChange={(e) => setBudgetName(e.target.value)}
                                        className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                        placeholder="e.g. Summer Campaign 2026"
                                        autoFocus
                                    />
                                    <p className="mt-2 text-sm text-slate-500">
                                        Give your budget a clear, descriptive name.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step-source"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSourceType("blank")}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${sourceType === "blank"
                                                ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                                                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="font-semibold text-slate-900 mb-1">Blank Budget</div>
                                        <div className="text-sm text-slate-500">Start from scratch with empty categories.</div>
                                    </button>

                                    <button
                                        onClick={() => setSourceType("template")}
                                        className={`p-4 rounded-lg border-2 text-left transition-all ${sourceType === "template"
                                                ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                                                : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                            }`}
                                    >
                                        <div className="font-semibold text-slate-900 mb-1">From Template</div>
                                        <div className="text-sm text-slate-500">Use an existing budget structure.</div>
                                    </button>
                                </div>

                                {sourceType === "template" && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <TemplateManager
                                            mode="select"
                                            onTemplateSelected={setSelectedTemplateId}
                                        />

                                        {selectedTemplateId && (
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="resetQuantitiesWizard"
                                                        checked={resetQuantities}
                                                        onChange={(e) => setResetQuantities(e.target.checked)}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <label htmlFor="resetQuantitiesWizard" className="text-sm text-slate-700">
                                                        Reset all quantities to zero (Structure Only)
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                    {step === "name" ? (
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button
                            onClick={() => setStep("name")}
                            className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            Back
                        </button>
                    )}

                    {step === "name" ? (
                        <button
                            onClick={() => setStep("source")}
                            disabled={!budgetName}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || (sourceType === "template" && !selectedTemplateId)}
                            className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Budget"
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
