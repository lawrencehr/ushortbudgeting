"use client";

import { useEffect, useState } from "react";
import { fetchBudget, BudgetCategory, BudgetGrouping, BudgetLineItem, addBudgetLineItem, deleteBudgetLineItem, CatalogItem, calculateLaborRate, createTemplate } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import CatalogSearch from "@/components/CatalogSearch";
import InspectorPanel from "@/components/InspectorPanel";
import ItemTypeModal from "@/components/ItemTypeModal";
import InlineItemEditor, { InlineItemData } from "@/components/InlineItemEditor";
import { UnsavedChangesIndicator } from "@/components/UnsavedChangesIndicator";
import { DepartmentSettingsPopover } from "@/components/DepartmentSettingsPopover"; // Saved correctly
import BudgetRow from "@/components/BudgetRow";
import BudgetHeader from "@/components/BudgetHeader";

const API_URL = 'http://localhost:8000/api';

interface Props {
    categoryId?: string;
    projectId: string;
    activeTab?: "ATL" | "BTL";
}

export default function BudgetSheet({ projectId, activeTab: propActiveTab, categoryId }: Props) {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"ATL" | "BTL">(propActiveTab || "ATL");
    const [saving, setSaving] = useState(false);

    // Template Modal State
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateDesc, setNewTemplateDesc] = useState("");
    const [resetQuantities, setResetQuantities] = useState(true);
    const [creatingTemplate, setCreatingTemplate] = useState(false);

    // Inline Adding State
    const [addingToGroupingId, setAddingToGroupingId] = useState<string | null>(null);
    const [isItemTypeModalOpen, setIsItemTypeModalOpen] = useState(false);
    const [addingType, setAddingType] = useState<'labor' | 'material' | null>(null);

    // Inspector State
    const [inspectorItem, setInspectorItem] = useState<{ catIdx: number, grpIdx: number, itemIdx: number } | null>(null);

    // Unsaved Changes State
    const [unsavedChangesCount, setUnsavedChangesCount] = useState(0);
    const [lastSavedAt, setLastSavedAt] = useState<Date>();

    // Collapsed Categories State
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    const toggleCollapse = (catId: string) => {
        setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    useEffect(() => {
        loadBudget();
    }, []);

    const loadBudget = () => {
        setLoading(true);
        fetchBudget()
            .then((data) => {
                const cats = data || [];
                setCategories(cats);
                setUnsavedChangesCount(0);

                // Initialize collapsed state: Empty categories (total == 0) collapsed by default
                const initialCollapsed: Record<string, boolean> = {};
                cats.forEach(c => {
                    if (c.total === 0) {
                        initialCollapsed[c.id] = true;
                    }
                });
                setCollapsedCategories(initialCollapsed);

                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load budget:', err);
                setCategories([]);
                setLoading(false);
            });
    };

    const handleInitiateAdd = (groupingId: string) => {
        setAddingToGroupingId(groupingId);
        setIsItemTypeModalOpen(true);
    };

    const handleTypeSelect = (type: 'labor' | 'material') => {
        setAddingType(type);
        setIsItemTypeModalOpen(false);
    };

    const handleCancelAdd = () => {
        setAddingToGroupingId(null);
        setAddingType(null);
    };

    const handleSaveNewItem = async (data: InlineItemData) => {
        if (!addingToGroupingId) return;

        // Optimistic Update
        const tempId = "temp-" + Date.now();
        const newItem: BudgetLineItem = {
            id: tempId,
            description: data.description,
            rate: data.rate,
            unit: data.unit,
            prep_qty: data.prep_qty,
            shoot_qty: data.shoot_qty,
            post_qty: data.post_qty,
            total: data.total,
            is_labor: data.is_labor,
            apply_fringes: data.is_labor,
            grouping_id: addingToGroupingId,
            notes: "",
            base_hourly_rate: data.base_rate,
            daily_hours: data.daily_hours,
            days_per_week: data.days_per_week,
            is_casual: false, // Editor doesn't have casual toggle yet
            calendar_mode: data.calendar_mode || 'inherit',
            phase_details: data.phase_details || {},
            award_classification_id: data.award_classification_id,
            role_history_id: data.role_history_id,
            labor_phases_json: JSON.stringify(data.phase_details?.active_phases || []),
            allowances: [],
            fringes_json: undefined
        };

        // Insert into local state
        const newCats = JSON.parse(JSON.stringify(categories));
        for (const cat of newCats) {
            const grp = cat.groupings.find((g: BudgetGrouping) => g.id === addingToGroupingId);
            if (grp) {
                grp.items.push(newItem);
                // Simple total update (recalc happens on save or explicit update usually, but let's keep it sync)
                grp.sub_total += newItem.total;
                cat.total += newItem.total;
                break;
            }
        }
        setCategories(newCats);
        setUnsavedChangesCount(prev => prev + 1);

        // Close editor
        handleCancelAdd();
    };

    const handleAdd = async (item: CatalogItem) => {
        // Legacy catalog add - adapted for local update
        try {
            // Find a target grouping
            let targetGroupingId = "";
            let targetCatIdx = -1;
            let targetGrpIdx = -1;

            // 1. Try to find a grouping that matches defaults or vaguely intelligent placement
            categories.forEach((c, cIdx) => {
                c.groupings.forEach((g, gIdx) => {
                    if (!targetGroupingId) {
                        if (item.is_labor) {
                            if (g.name.includes("Camera") || g.name.includes("Crew")) {
                                targetGroupingId = g.id;
                                targetCatIdx = cIdx;
                                targetGrpIdx = gIdx;
                            }
                        } else {
                            targetGroupingId = g.id;
                            targetCatIdx = cIdx;
                            targetGrpIdx = gIdx;
                        }
                    }
                });
            });

            if (!targetGroupingId && categories.length > 0 && categories[0].groupings.length > 0) {
                targetGroupingId = categories[0].groupings[0].id;
                targetCatIdx = 0;
                targetGrpIdx = 0;
            }

            if (!targetGroupingId) {
                alert("No groupings found in budget. Cannot add item.");
                return;
            }

            const tempId = "temp-" + Date.now();
            const newItem: BudgetLineItem = {
                id: tempId,
                description: item.description,
                rate: item.default_rate,
                unit: 'day',
                prep_qty: 0,
                shoot_qty: 0,
                post_qty: 0,
                total: 0,
                is_labor: item.is_labor,
                apply_fringes: item.is_labor,
                grouping_id: targetGroupingId,
                base_hourly_rate: item.default_rate,
                daily_hours: 10,
                days_per_week: 5,
                is_casual: false
            };

            const newCats = JSON.parse(JSON.stringify(categories));
            const cat = newCats[targetCatIdx];
            const grp = cat.groupings[targetGrpIdx];
            grp.items.push(newItem);

            setCategories(newCats);
            setUnsavedChangesCount(prev => prev + 1);

        } catch (err) {
            console.error(err);
            alert("Failed to add item");
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this line item?")) return;

        const newCats = JSON.parse(JSON.stringify(categories));
        let found = false;
        for (const cat of newCats) {
            for (const grp of cat.groupings) {
                const idx = grp.items.findIndex((i: any) => i.id === itemId);
                if (idx !== -1) {
                    const removed = grp.items.splice(idx, 1)[0];
                    grp.sub_total -= removed.total;
                    cat.total -= removed.total;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (found) {
            setCategories(newCats);
            setUnsavedChangesCount(prev => prev + 1);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categories),
            });
            if (res.ok) {
                setUnsavedChangesCount(0);
                setLastSavedAt(new Date());
                // Optional: Reload to align state with backend (ids etc)
                // But only if we want to confirm structure.
                loadBudget();
            } else {
                alert("Error saving budget");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving budget");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplateName) return;
        const budgetId = categories.length > 0 ? (categories[0] as any).budget_id : null;

        if (!budgetId) {
            // Fallback or alert?
            // If new budget, maybe no budget_id yet? But fetchBudget returns categories which usually have budget_id attached if normalized.
            // If not check categories[0].groupings[0].items[0]... a bit risky.
            alert("Cannot create template: Budget ID not found.");
            return;
        }

        setCreatingTemplate(true);
        try {
            await createTemplate({
                name: newTemplateName,
                description: newTemplateDesc,
                budget_id: budgetId,
                reset_quantities: resetQuantities
            });
            alert("Template created successfully!");
            setIsTemplateModalOpen(false);
            setNewTemplateName("");
            setNewTemplateDesc("");
        } catch (e) {
            console.error(e);
            alert("Failed to create template");
        } finally {
            setCreatingTemplate(false);
        }
    };

    const updateItemLocal = (catIdx: number, grpIdx: number, itemIdx: number, updates: Partial<BudgetLineItem> | string, value?: any) => {
        setCategories(prevCategories => {
            const newCategories = JSON.parse(JSON.stringify(prevCategories));
            // Safety check in case indices are out of bounds (though unlikely with strict passing)
            if (!newCategories[catIdx]?.groupings[grpIdx]?.items[itemIdx]) return prevCategories;

            const item = newCategories[catIdx].groupings[grpIdx].items[itemIdx];

            if (typeof updates === "string") {
                (item as any)[updates] = value;
            } else {
                Object.assign(item, updates);
            }

            // Recalculate Total
            const qty = (parseFloat(item.prep_qty as any) || 0) + (parseFloat(item.shoot_qty as any) || 0) + (parseFloat(item.post_qty as any) || 0);
            const rate = parseFloat(item.rate as any) || 0;

            if (typeof updates !== "string" && (updates as any).total !== undefined) {
                // If the update explicitly includes a new total (e.g. from backend calc or direct override), use it.
                item.total = (updates as any).total;
            } else {
                // Calculation Logic for Local Updates (e.g. Rate change without explicit total)

                // If it's a "Calendar Based" Hourly item, do NOT auto-recalculate total blindly using old weekly logic.
                // We should assume the backend total is still valid *unless* rate/qty changed, 
                // in which case handleLaborRecalc usually triggers properly.
                // But updateItemLocal runs synchronously on keystrokes.

                if (item.is_labor && item.unit === 'hour') {
                    // For "Hourly" items (which are effectively Calendar Based now),
                    // we avoid overwriting total with legacy "Weekly Rate" logic.
                    // If rate changed, we trust onRecalcLabor to fix the total in a moment.
                    // So we do NOTHING here for Total, preserving the last known valid total.
                    // Exception: If quantity multiplier logic is desired (e.g. 2 x Camera Ops), 
                    // we might need to multiply the "breakdown cost" by quantity-multiplier?
                    // Currently V1 Spec implies Single Person per Line Item or explicit Quantity field?
                    // "prep_qty" is days.
                    // If we have a 'Quantity' column for "Count of People", that's different.
                    // The current quantity fields are DAYS.
                    // So Total is Total. We skip local legacy recalc.

                } else {
                    // Standard / Materials / Flat Rates / Weekly Legacy
                    // Legacy Weekly logic:
                    if (item.unit === 'week' && item.is_labor) {
                        const dailyHours = parseFloat(item.daily_hours as any) || 10;
                        const daysPerWeek = parseFloat(item.days_per_week as any) || 5;
                        const rate = parseFloat(item.rate as any) || 0;
                        // If rate is weekly rate, just rate * (qty / 5)? 
                        // Or rate is hourly?
                        // Let's stick to simple: Total = Rate * Qty for non-hourly.
                        item.total = rate * (qty || 0); // If qty 0, total 0
                    } else {
                        item.total = rate * (qty || (item.is_labor ? 0 : 1));
                    }
                }
            }

            // Calculate Sub-total including fringes
            newCategories[catIdx].groupings[grpIdx].sub_total = newCategories[catIdx].groupings[grpIdx].items.reduce((acc: number, curr: BudgetLineItem) => {
                // Total is now expected to be INCLUSIVE of fringes for Labor items
                return acc + (curr.total || 0);
            }, 0);
            newCategories[catIdx].total = newCategories[catIdx].groupings.reduce((acc: number, curr: BudgetGrouping) => acc + (curr.sub_total || 0), 0);

            return newCategories;
        });
        setUnsavedChangesCount(prev => prev + 1);
    };

    const handleLaborRecalc = async (catIdx: number, grpIdx: number, itemIdx: number, overrides?: Partial<BudgetLineItem>) => {
        // Use current state to get baseline, but apply overrides for calc
        const item = categories[catIdx].groupings[grpIdx].items[itemIdx];
        if (!item && !overrides) return;

        // Merge current item with overrides for calculation parameters
        const effectiveItem = { ...item, ...overrides };

        if (!effectiveItem.is_labor) {
            // Material items will be handled later or simple calc
            // For now, if non-labor, just strict update
            if (overrides) updateItemLocal(catIdx, grpIdx, itemIdx, overrides);
            return;
        }

        try {
            // Construct Request for New API
            const req = {
                line_item_id: effectiveItem.id.startsWith('temp') ? undefined : effectiveItem.id,
                base_hourly_rate: effectiveItem.base_hourly_rate || effectiveItem.rate || 0,
                is_casual: effectiveItem.is_casual || false,
                is_artist: (categories[catIdx].name.includes('Artist') || categories[catIdx].name.includes('Cast')),
                calendar_mode: effectiveItem.calendar_mode || 'inherit',
                phase_details: effectiveItem.phase_details,
                grouping_id: effectiveItem.grouping_id,
                project_id: projectId,
                award_classification_id: effectiveItem.award_classification_id
            };

            // Call API
            const { calculateLaborCost } = await import('@/lib/api');

            const res = await calculateLaborCost(req as any);

            // Calculate active total based on enabled phases (qty > 0)
            let activeGross = 0;
            const prepQty = Number(effectiveItem.prep_qty) || 0;
            const shootQty = Number(effectiveItem.shoot_qty) || 0;
            const postQty = Number(effectiveItem.post_qty) || 0;

            if (prepQty > 0 && res.breakdown.preProd) {
                activeGross += res.breakdown.preProd.cost;
            }
            if (shootQty > 0 && res.breakdown.shoot) {
                activeGross += res.breakdown.shoot.cost;
            }
            if (postQty > 0 && res.breakdown.postProd) {
                activeGross += res.breakdown.postProd.cost;
            }

            // Calculate Fringes proportional to ActiveGross
            // (Backend returns fringes for Total Calendar, we need to scale it if only partial phases are active)
            let activeFringesObj = res.fringes;
            let activeFringeAmount = res.fringes.total_fringes || 0;

            if (res.total_cost > 0 && activeGross !== res.total_cost) {
                const ratio = activeGross / res.total_cost;
                activeFringeAmount = activeFringeAmount * ratio;

                // Scale the detail object
                activeFringesObj = {
                    super: (res.fringes.super || 0) * ratio,
                    holiday_pay: (res.fringes.holiday_pay || 0) * ratio,
                    payroll_tax: (res.fringes.payroll_tax || 0) * ratio,
                    workers_comp: (res.fringes.workers_comp || 0) * ratio,
                    total_fringes: activeFringeAmount
                };
            }

            const updates: any = {
                ...overrides,
                total: activeGross + activeFringeAmount, // INCLUSIVE TOTAL
                fringes_json: JSON.stringify(activeFringesObj),
                breakdown_json: JSON.stringify(res.breakdown)
            };

            // Update Total
            // Note: We ignore "Unit" multiplier logic because "Hourly" is now "Calendar based".
            // If Unit is "Week", we might display "Rate" differently, but Total is Total.
            updates.total = activeGross + activeFringeAmount;

            // If Unit is Hour, Rate field shows Base Hourly.
            // If Unit is Week, Rate field *could* show Weekly Rate.
            // Backend res doesn't purely return "Weekly Rate".
            // Implementation Decision: Maintain Base Hourly in "Rate" column for consistency in Hourly Mode.
            if (effectiveItem.unit === 'hour') {
                if (overrides?.base_hourly_rate) updates.rate = overrides.base_hourly_rate;
                // If no override, rate remains as is (base hourly)
            } else if (effectiveItem.unit === 'day') {
                // If daily, maybe show daily rate.
            }

            updateItemLocal(catIdx, grpIdx, itemIdx, updates);
        } catch (err) {
            console.error("Error calculating labor rate", err);
            if (overrides) updateItemLocal(catIdx, grpIdx, itemIdx, overrides);
        }
    };

    const getFringes = (item: BudgetLineItem) => {
        if (!item.fringes_json) return null;
        try {
            return JSON.parse(item.fringes_json) as import("@/lib/api").FringeBreakdown;
        } catch { return null; }
    };

    const filteredCategories = categories.filter(c => {
        if (categoryId) return c.id === categoryId;
        const isAtl = c.id.startsWith('A') || c.id.startsWith('B');
        return activeTab === "ATL" ? isAtl : !isAtl;
    });

    if (loading) return <div className="p-4">Loading Budget...</div>;

    return (
        <div className="space-y-4 text-xs">
            <InspectorPanel
                isOpen={!!inspectorItem}
                onClose={() => setInspectorItem(null)}
                item={inspectorItem ? categories[inspectorItem.catIdx].groupings[inspectorItem.grpIdx].items[inspectorItem.itemIdx] : null}
                onUpdateItem={(updates) => inspectorItem && updateItemLocal(inspectorItem.catIdx, inspectorItem.grpIdx, inspectorItem.itemIdx, updates)}
            />

            <ItemTypeModal
                isOpen={isItemTypeModalOpen}
                onClose={() => setIsItemTypeModalOpen(false)}
                onSelect={handleTypeSelect}
            />

            <div className="flex justify-between items-center bg-white p-4 rounded shadow border-b border-indigo-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        {categoryId ? (
                            (() => {
                                const cat = categories.find(c => c.id === categoryId);
                                return cat ? `${cat.code}: ${cat.name}` : `Department: ${categoryId}`;
                            })()
                        ) : "Budget Worksheet"}
                    </h2>
                    {!categoryId && <CatalogSearch onAdd={handleAdd} />}
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded h-10 text-sm font-semibold transition-colors"
                    >
                        Save as Template
                    </button>
                    <UnsavedChangesIndicator
                        unsavedCount={unsavedChangesCount}
                        isSaving={saving}
                        onSave={handleSave}
                        lastSavedAt={lastSavedAt}
                    />
                </div>
            </div>

            <AnimatePresence>
                {isTemplateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Save Budget as Template</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                                        <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Master Template v1" autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                        <textarea value={newTemplateDesc} onChange={(e) => setNewTemplateDesc(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-indigo-500" rows={2} />
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                                        <input type="checkbox" id="resetQ" checked={resetQuantities} onChange={(e) => setResetQuantities(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                        <label htmlFor="resetQ" className="text-sm text-slate-700">Reset all quantities to zero</label>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium">Cancel</button>
                                    <button onClick={handleCreateTemplate} disabled={creatingTemplate || !newTemplateName} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{creatingTemplate ? "Creating..." : "Create Template"}</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {!categoryId && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setActiveTab("ATL")} className={`${activeTab === "ATL" ? "border-indigo-500 text-indigo-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors`}>Above The Line (A-B)</button>
                        <button onClick={() => setActiveTab("BTL")} className={`${activeTab === "BTL" ? "border-indigo-500 text-indigo-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-4 px-1 border-b-2 text-sm transition-colors`}>Below The Line (C-X)</button>
                    </nav>
                </div>
            )}

            <div className="space-y-8">
                {filteredCategories.length === 0 && !loading && (
                    <div className="text-center p-8 text-gray-500 italic">No budget data for this category.</div>
                )}
                {filteredCategories.map((cat, catIdx) => {
                    // Note: finding strict index in full array if filtered?
                    // updateItemLocal needs global index.
                    // The map key calls 'catIdx' which is index in 'filteredCategories'.
                    // We need explicit global index.
                    const catGlobalIdx = categories.findIndex(c => c.id === cat.id);
                    const isCollapsed = collapsedCategories[cat.id];
                    const isEmpty = cat.total === 0;

                    return (
                        <motion.div key={cat.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`bg-white shadow-lg rounded-xl border border-slate-200 transition-all ${isCollapsed && isEmpty ? 'opacity-70' : ''}`}>
                            <div className="bg-slate-800 text-white px-4 py-2.5 flex justify-between items-center text-sm font-bold tracking-tight cursor-pointer hover:bg-slate-700 transition-colors rounded-t-xl" onClick={() => toggleCollapse(cat.id)}>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-xs w-4">{isCollapsed ? '▶' : '▼'}</span>
                                    <span>{cat.code} - {cat.name}</span>
                                    {isEmpty && <span className="bg-slate-600 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ml-2">EMPTY</span>}
                                </div>
                                {!isCollapsed && <span className="bg-slate-700 px-3 py-1 rounded text-emerald-400 font-mono">Total: ${cat.total.toLocaleString()}</span>}
                            </div>

                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                                        animate={{ height: "auto", opacity: 1, overflow: "visible" }}
                                        exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                                        transition={{ duration: 0.3, ease: "easeOut" }}
                                    >
                                        <div className="p-4 space-y-6 bg-slate-50/30 rounded-b-xl overflow-visible">
                                            {cat.groupings.map((grp, grpIdx) => (
                                                <motion.div key={grp.id} layout className="bg-white border border-slate-200 rounded-lg shadow-sm !overflow-visible">



                                                    <div className="bg-slate-50 px-3 py-1.5 flex justify-between items-center font-bold text-slate-700 border-b border-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <span>{grp.code} - {grp.name}</span>
                                                            <DepartmentSettingsPopover groupingId={grp.id} groupingName={grp.name} />
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={(e) => { e.stopPropagation(); handleInitiateAdd(grp.id); }} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"><span>+ Add Item</span></button>
                                                            <span className="text-slate-500">Sub-total: ${grp.sub_total.toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {addingToGroupingId === grp.id && addingType && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0, y: -10, overflow: "hidden" }}
                                                                animate={{ height: "auto", opacity: 1, y: 0, transitionEnd: { overflow: "visible" } }}
                                                                exit={{ height: 0, opacity: 0, y: -10, overflow: "hidden" }}
                                                                transition={{ duration: 0.2 }}
                                                                className="bg-slate-50 p-2 border-b border-indigo-100"
                                                            >
                                                                <InlineItemEditor isLabor={addingType === 'labor'} groupingId={grp.id} onSave={handleSaveNewItem} onCancel={handleCancelAdd} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <div className="mt-2 text-xs">
                                                        <BudgetHeader />
                                                        <div className="space-y-1 mt-1">
                                                            <AnimatePresence mode='popLayout'>
                                                                {grp.items.map((item, itemIdx) => (
                                                                    <BudgetRow
                                                                        key={item.id}
                                                                        item={item}
                                                                        onChange={(updates) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, updates)}
                                                                        onDelete={() => handleDelete(item.id)}
                                                                        onExpandInspector={() => setInspectorItem({ catIdx: catGlobalIdx, grpIdx, itemIdx })}
                                                                        onRecalcLabor={(overrides) => handleLaborRecalc(catGlobalIdx, grpIdx, itemIdx, overrides)}
                                                                    />
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
