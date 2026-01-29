"use client";

import { useEffect, useState } from "react";
import { fetchTemplates, createTemplate, deleteTemplate, BudgetTemplate } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface TemplateManagerProps {
    currentBudgetId?: string;
    onTemplateSelected?: (templateId: string) => void;
    mode?: "manage" | "select";
}

export function TemplateManager({ currentBudgetId, onTemplateSelected, mode = "manage" }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDesc, setNewTemplateDesc] = useState("");
    const [resetQuantities, setResetQuantities] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    async function loadTemplates() {
        try {
            setIsLoading(true);
            const data = await fetchTemplates();
            setTemplates(data);
        } catch (err) {
            setError("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCreateTemplate() {
        if (!newTemplateName || !currentBudgetId) return;

        try {
            await createTemplate({
                name: newTemplateName,
                description: newTemplateDesc,
                budget_id: currentBudgetId,
                reset_quantities: resetQuantities,
            });
            setShowCreateModal(false);
            setNewTemplateName("");
            setNewTemplateDesc("");
            loadTemplates();
        } catch (err) {
            setError("Failed to create template");
        }
    }

    async function handleDeleteTemplate(id: string) {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await deleteTemplate(id);
            setTemplates(templates.filter((t) => t.id !== id));
        } catch (err) {
            setError("Failed to delete template");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">
                    {mode === "manage" ? "Manage Templates" : "Select a Template"}
                </h2>
                {mode === "manage" && currentBudgetId && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Save Current Budget as Template
                    </button>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-8 text-slate-500">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-500">No templates found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {templates.map((template) => (
                            <motion.div
                                key={template.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-slate-900">{template.name}</h3>
                                    {mode === "manage" && (
                                        <button
                                            onClick={() => handleDeleteTemplate(template.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Delete Template"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        </button>
                                    )}
                                </div>
                                {template.description && (
                                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                                        {template.description}
                                    </p>
                                )}
                                <div className="flex gap-4 text-xs text-slate-500 mb-4">
                                    <span>{template.category_count} Categories</span>
                                    <span>{template.item_count} Items</span>
                                </div>

                                {mode === "select" && onTemplateSelected && (
                                    <button
                                        onClick={() => onTemplateSelected(template.id)}
                                        className="w-full py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-sm font-medium transition-colors"
                                    >
                                        Select Template
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Template Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">Save as Template</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Template Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g., Standard Documentary Budget"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={newTemplateDesc}
                                        onChange={(e) => setNewTemplateDesc(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Brief description of what this template includes..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="resetQuantities"
                                        checked={resetQuantities}
                                        onChange={(e) => setResetQuantities(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="resetQuantities" className="text-sm text-slate-700">
                                        Reset quantities to zero (keep structure only)
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTemplate}
                                    disabled={!newTemplateName}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Template
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
