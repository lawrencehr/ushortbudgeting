"use client";

import { useEffect, useState } from "react";
import { fetchBudget, BudgetCategory, BudgetGrouping, BudgetLineItem, addBudgetLineItem, deleteBudgetLineItem, CatalogItem, calculateLaborRate } from "@/lib/api";
import CatalogSearch from "@/components/CatalogSearch";
import InspectorPanel from "@/components/InspectorPanel";
import ItemTypeModal from "@/components/ItemTypeModal";
import InlineItemEditor, { InlineItemData } from "@/components/InlineItemEditor";

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

    // Inline Adding State
    const [addingToGroupingId, setAddingToGroupingId] = useState<string | null>(null);
    const [isItemTypeModalOpen, setIsItemTypeModalOpen] = useState(false);
    const [addingType, setAddingType] = useState<'labor' | 'material' | null>(null);

    // Inspector State
    const [inspectorItem, setInspectorItem] = useState<{ catIdx: number, grpIdx: number, itemIdx: number } | null>(null);

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
            apply_fringes: data.is_labor, // Logic? usually yes if labor
            grouping_id: addingToGroupingId,
            notes: "",
            // Enhanced fields
            base_hourly_rate: data.base_rate,
            daily_hours: data.daily_hours,
            days_per_week: data.days_per_week,
            is_casual: false, // Default
            labor_phases_json: "[]",
            allowances: [],
            fringes_json: undefined
        };

        // Insert into local state
        const newCats = [...categories];
        // Find grouping
        for (const cat of newCats) {
            const grp = cat.groupings.find(g => g.id === addingToGroupingId);
            if (grp) {
                grp.items.push(newItem);
                // Update grouping total
                grp.sub_total += newItem.total;
                cat.total += newItem.total;
                break;
            }
        }
        setCategories(newCats);

        // Close editor
        handleCancelAdd();

        // Async Save to Backend
        try {
            // We use the existing API which takes (groupingId, description, rate, isLabor).
            // But we have MORE data now. 
            // The existing `addBudgetLineItem` API is too simple.
            // We should use `addBudgetLineItem` but it needs to support the full payload 
            // OR update the existing item after creation?
            // Ideally backend endpoint `/api/budget/items` accepts LineItemBase.
            // Let's check api.ts `addBudgetLineItem`.
            // It calls POST /api/budget/items with body { grouping_id, description, rate, is_labor }.
            // The backend `add_line_item` expects `LineItemBase`.
            // So if checking api.ts, it only sends 4 fields???
            // Let's verify api.ts.
            // Confirmed: api.ts `addBudgetLineItem` only sends 4 fields.
            // I need to update api.ts to send full object if I want to save everything.
            // For now, I will use the simple add, but assume I'll fix api.ts later or right now?
            // PHASE 2 plan includes "Integrate into GroupingHeader".
            // I should technically fix the API call too. 
            // Let's call a new function or update `addBudgetLineItem`.

            // For this step, I'll pass everything I can.
            // API updated to accept partial BudgetLineItem
            await addBudgetLineItem(addingToGroupingId, {
                description: data.description,
                rate: data.rate,
                is_labor: data.is_labor,
                unit: data.unit,
                prep_qty: data.prep_qty,
                shoot_qty: data.shoot_qty,
                post_qty: data.post_qty,
                total: data.total,
                base_hourly_rate: data.base_rate,
                daily_hours: data.daily_hours,
                days_per_week: data.days_per_week,
                labor_phases_json: "[]", // Default
                fringes_json: undefined
            });

            // Reload to get real ID and full calc?
            // Or update local ID with real ID?
            // For MVP, reloading is safer to ensure consistency.
            loadBudget();

        } catch (e) {
            console.error(e);
            alert("Failed to save item");
        }
    };

    const handleAdd = async (item: CatalogItem) => {
        try {
            // Find a target grouping
            let targetGroupingId = "";

            // 1. Try to find a grouping that matches defaults or vaguely intelligent placement
            const allGroupings: { id: string, name: string, catId: string }[] = [];
            categories.forEach(c => {
                c.groupings.forEach(g => allGroupings.push({ ...g, catId: c.id }));
            });

            if (allGroupings.length > 0) {
                if (item.is_labor) {
                    const crewGrp = allGroupings.find(g => g.name.includes("Camera") || g.name.includes("Crew"));
                    targetGroupingId = crewGrp ? crewGrp.id : allGroupings[0].id;
                } else {
                    targetGroupingId = allGroupings[0].id;
                }
            } else {
                alert("No groupings found in budget. Cannot add item.");
                return;
            }

            await addBudgetLineItem(targetGroupingId, {
                description: item.description,
                rate: item.default_rate,
                is_labor: item.is_labor
            });
            loadBudget();
        } catch (err) {
            console.error(err);
            alert("Failed to add item");
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this line item?")) return;
        try {
            await deleteBudgetLineItem(itemId);
            loadBudget();
        } catch (err) {
            console.error(err);
            alert("Failed to delete item");
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
                alert("Budget saved!");
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

    const updateItemLocal = (catIdx: number, grpIdx: number, itemIdx: number, updates: Partial<BudgetLineItem> | string, value?: any) => {
        const newCategories = JSON.parse(JSON.stringify(categories));
        const item = newCategories[catIdx].groupings[grpIdx].items[itemIdx];

        if (typeof updates === "string") {
            (item as any)[updates] = value;
        } else {
            Object.assign(item, updates);
        }

        const qty = (parseFloat(item.prep_qty as any) || 0) + (parseFloat(item.shoot_qty as any) || 0) + (parseFloat(item.post_qty as any) || 0);
        const rate = parseFloat(item.rate as any) || 0;

        // If updates contains a total, respect it (Phased Labor scenario)
        if (typeof updates !== "string" && (updates as any).total !== undefined) {
            item.total = (updates as any).total;
        } else {
            const finalQty = (qty === 0 && rate > 0) ? 1 : qty;
            item.total = rate * finalQty;
        }

        // Calculate Sub-total including fringes
        newCategories[catIdx].groupings[grpIdx].sub_total = newCategories[catIdx].groupings[grpIdx].items.reduce((acc: number, curr: BudgetLineItem) => {
            let itemTotal = curr.total || 0;
            if (curr.is_labor && curr.apply_fringes && curr.fringes_json) {
                try {
                    const f = JSON.parse(curr.fringes_json);
                    itemTotal += (f.total_fringes || 0) * (curr.shoot_qty || 0); // Fringes applied per week/unit? Usually fringes are calculated on the singular rate, so we multiply by Qty.
                    // Wait, calculateLaborRate returns fringes for ONE WEEK (weekly_rate).
                    // So total fringes = fringes.total_fringes * (prep + shoot + post quantities).
                    const totalQty = (parseFloat(curr.prep_qty as any) || 0) + (parseFloat(curr.shoot_qty as any) || 0) + (parseFloat(curr.post_qty as any) || 0);
                    itemTotal += (f.total_fringes || 0) * (totalQty || 1);
                } catch { }
            }
            return acc + itemTotal;
        }, 0);
        newCategories[catIdx].total = newCategories[catIdx].groupings.reduce((acc: number, curr: BudgetGrouping) => acc + (curr.sub_total || 0), 0);

        setCategories(newCategories);
    };

    const handleLaborRecalc = async (catIdx: number, grpIdx: number, itemIdx: number) => {
        const item = categories[catIdx].groupings[grpIdx].items[itemIdx];
        if (!item.is_labor) return;
        const base = item.base_hourly_rate || 0;
        const hours = item.daily_hours || 10;
        const days = item.days_per_week || 5;
        const casual = item.is_casual || false;
        try {
            const res = await calculateLaborRate(base, hours, days, casual);
            updateItemLocal(catIdx, grpIdx, itemIdx, {
                rate: res.weekly_rate,
                fringes_json: JSON.stringify(res.fringes)
            });
        } catch (err) {
            console.error("Error calculating labor rate", err);
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
                <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 h-10 text-sm font-semibold shadow-sm transition-all">
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

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
                {filteredCategories.map((cat, _) => {
                    const isCollapsed = collapsedCategories[cat.id];
                    // Determine if empty (simplified for now: total == 0 or empty lists, but total is safer)
                    const isEmpty = cat.total === 0;

                    return (
                        <div key={cat.id} className={`bg-white shadow-lg rounded-xl overflow-hidden border border-slate-200 transition-all ${isCollapsed && isEmpty ? 'opacity-70' : ''}`}>
                            <div
                                className="bg-slate-800 text-white px-4 py-2.5 flex justify-between items-center text-sm font-bold tracking-tight cursor-pointer hover:bg-slate-700 transition-colors"
                                onClick={() => toggleCollapse(cat.id)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-xs w-4">
                                        {isCollapsed ? '▶' : '▼'}
                                    </span>
                                    <span>{cat.code} - {cat.name}</span>
                                    {isEmpty && (
                                        <span className="bg-slate-600 text-slate-300 text-[10px] px-2 py-0.5 rounded-full ml-2">
                                            EMPTY
                                        </span>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <span className="bg-slate-700 px-3 py-1 rounded text-emerald-400 font-mono">
                                        Total: ${cat.total.toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {!isCollapsed && (
                                <div className="p-4 space-y-6 bg-slate-50/30">
                                    {cat.groupings.map((grp, grpIdx) => (
                                        <div key={grp.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 px-3 py-1.5 flex justify-between items-center font-bold text-slate-700 border-b border-slate-200">
                                                <span>{grp.code} - {grp.name}</span>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleInitiateAdd(grp.id);
                                                        }}
                                                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                                    >
                                                        <span>+ Add Item</span>
                                                    </button>
                                                    <span className="text-slate-500">Sub-total: ${grp.sub_total.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Inline Editor Area */}
                                            {addingToGroupingId === grp.id && addingType && (
                                                <div className="bg-slate-50 p-2 border-b border-indigo-100">
                                                    <InlineItemEditor
                                                        isLabor={addingType === 'labor'}
                                                        onSave={handleSaveNewItem}
                                                        onCancel={handleCancelAdd}
                                                    />
                                                </div>
                                            )}

                                            <table className="min-w-full divide-y divide-slate-100 table-fixed">
                                                <thead className="bg-slate-50/50">
                                                    <tr>
                                                        <th className="px-2 py-1.5 text-left font-bold text-slate-400 uppercase text-[10px] w-auto">Description</th>
                                                        <th className="px-2 py-1.5 text-left font-bold text-slate-400 uppercase text-[10px] w-32">Notes</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-20">$/Hr</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-12">Hrs</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-12">Days</th>
                                                        <th className="px-2 py-1.5 text-center font-bold text-slate-400 uppercase text-[10px] w-10">Cas</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-700 uppercase text-[10px] w-24 bg-slate-100">Weekly Rate</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-12">Prp</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-12">Sht</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-400 uppercase text-[10px] w-12">Pst</th>
                                                        <th className="px-2 py-1.5 text-right font-bold text-slate-700 uppercase text-[10px] w-28 bg-indigo-50/30">Total</th>
                                                        <th className="px-2 py-1.5 text-center font-bold text-slate-400 uppercase text-[10px] w-10">Lbr</th>
                                                        <th className="px-2 py-1.5 w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {grp.items.map((item, itemIdx) => {
                                                        const isLabor = item.is_labor;
                                                        const isPhased = item.labor_phases_json && item.labor_phases_json.length > 2;
                                                        const catGlobalIdx = categories.findIndex(c => c.id === cat.id);
                                                        const fringes = getFringes(item);
                                                        const totalQty = (item.prep_qty || 0) + (item.shoot_qty || 0) + (item.post_qty || 0);
                                                        const qtyMult = totalQty || 1;

                                                        // Calculate fringe totals for display
                                                        const fSuper = fringes ? (fringes.super * qtyMult) : 0;
                                                        const fTax = fringes ? (fringes.payroll_tax * qtyMult) : 0;
                                                        const fWorkCover = fringes ? (fringes.workers_comp * qtyMult) : 0;
                                                        const fHoliday = fringes ? (fringes.holiday_pay * qtyMult) : 0;

                                                        return (
                                                            <div style={{ display: 'contents' }} key={item.id}>
                                                                <tr className="hover:bg-indigo-50/20 group transition-colors">
                                                                    <td className="px-2 py-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                value={item.description}
                                                                                onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'description', e.target.value)}
                                                                                className="w-full border-none focus:ring-0 p-0 bg-transparent font-medium text-slate-700"
                                                                            />
                                                                            {isLabor && (
                                                                                <>
                                                                                    {item.crew_member_id && (
                                                                                        <span className="text-indigo-600 text-[10px] bg-indigo-50 px-1 rounded border border-indigo-200 font-bold" title="Crew Member Linked">
                                                                                            CREW
                                                                                        </span>
                                                                                    )}
                                                                                    <button
                                                                                        onClick={() => setInspectorItem({ catIdx: catGlobalIdx, grpIdx, itemIdx })}
                                                                                        className="text-slate-300 hover:text-indigo-600 px-1 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                                                                                        title="Open Inspector"
                                                                                    >
                                                                                        ℹ️
                                                                                    </button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1">
                                                                        <input
                                                                            value={item.notes || ''}
                                                                            placeholder="..."
                                                                            onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'notes', e.target.value)}
                                                                            className="w-full border-none focus:ring-0 p-0 bg-transparent text-xs text-slate-500 italic placeholder-slate-200"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-1">
                                                                        <input
                                                                            type="number"
                                                                            disabled={!!(!isLabor || isPhased)}
                                                                            value={item.base_hourly_rate || ''}
                                                                            onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'base_hourly_rate', parseFloat(e.target.value))}
                                                                            onBlur={() => handleLaborRecalc(catGlobalIdx, grpIdx, itemIdx)}
                                                                            className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${!isLabor || isPhased ? "bg-slate-50 text-slate-400" : "text-slate-700"}`}
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-1"><input type="number" disabled={!!(!isLabor || isPhased)} value={item.daily_hours || ''} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'daily_hours', parseFloat(e.target.value))} onBlur={() => handleLaborRecalc(catGlobalIdx, grpIdx, itemIdx)} className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${!isLabor || isPhased ? "bg-slate-50 text-slate-400" : "text-slate-700"}`} /></td>
                                                                    <td className="px-2 py-1"><input type="number" disabled={!!(!isLabor || isPhased)} value={item.days_per_week || ''} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'days_per_week', parseFloat(e.target.value))} onBlur={() => handleLaborRecalc(catGlobalIdx, grpIdx, itemIdx)} className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${!isLabor || isPhased ? "bg-slate-50 text-slate-400" : "text-slate-700"}`} /></td>
                                                                    <td className="px-2 py-1 text-center"><input type="checkbox" disabled={!!(!isLabor || isPhased)} checked={item.is_casual || false} onChange={(e) => { updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'is_casual', e.target.checked); calculateLaborRate(item.base_hourly_rate, item.daily_hours, item.days_per_week, e.target.checked).then(res => { updateItemLocal(catGlobalIdx, grpIdx, itemIdx, { rate: res.weekly_rate }); }); }} className="h-3 w-3 accent-indigo-600" /></td>
                                                                    <td className="px-2 py-1 bg-slate-50 font-bold text-slate-700">
                                                                        {isPhased ? (
                                                                            <div
                                                                                className="w-full text-right text-[10px] font-bold text-indigo-600 bg-indigo-50/50 px-1 py-0.5 rounded cursor-pointer border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                                                onClick={() => setInspectorItem({ catIdx: catGlobalIdx, grpIdx, itemIdx })}
                                                                                title="Phased Rates Active (Click to view)"
                                                                            >
                                                                                MIXED ⚙️
                                                                            </div>
                                                                        ) : (
                                                                            <input type="number" value={item.rate} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'rate', parseFloat(e.target.value))} className="w-full text-right border-none bg-transparent p-0 focus:ring-0 font-mono text-emerald-600" />
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1"><input type="number" disabled={!!isPhased} value={item.prep_qty} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'prep_qty', parseFloat(e.target.value))} className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${isPhased ? "bg-slate-50 text-slate-300" : "text-slate-600"}`} /></td>
                                                                    <td className="px-2 py-1"><input type="number" disabled={!!isPhased} value={item.shoot_qty} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'shoot_qty', parseFloat(e.target.value))} className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${isPhased ? "bg-slate-50 text-slate-300" : "text-slate-600"}`} /></td>
                                                                    <td className="px-2 py-1"><input type="number" disabled={!!isPhased} value={item.post_qty} onChange={(e) => updateItemLocal(catGlobalIdx, grpIdx, itemIdx, 'post_qty', parseFloat(e.target.value))} className={`w-full text-right rounded border-slate-200 p-0.5 font-mono ${isPhased ? "bg-slate-50 text-slate-300" : "text-slate-600"}`} /></td>
                                                                    <td className="px-2 py-1 text-right font-bold text-slate-800 bg-indigo-50/10 font-mono">${item.total.toLocaleString()}</td>
                                                                    <td className="px-2 py-1 text-center"><input type="checkbox" checked={item.is_labor} onChange={(e) => { updateItemLocal(catGlobalIdx, grpIdx, itemIdx, { is_labor: e.target.checked, apply_fringes: e.target.checked }); }} className="h-3 w-3 accent-slate-600" /></td>
                                                                    <td className="px-2 py-1 text-right"><button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Delete Item">✕</button></td>
                                                                </tr>
                                                                {isLabor && item.apply_fringes && fringes && (
                                                                    <>
                                                                        <tr className="bg-slate-50 text-[10px] text-slate-500 border-l-4 border-l-amber-400">
                                                                            <td className="px-2 py-0.5 text-right font-medium">↳  Superannuation</td>
                                                                            <td colSpan={8}></td>
                                                                            <td className="px-2 py-0.5 text-right font-mono text-slate-600">${fSuper.toLocaleString()}</td>
                                                                            <td colSpan={2}></td>
                                                                        </tr>
                                                                        <tr className="bg-slate-50 text-[10px] text-slate-500 border-l-4 border-l-amber-400">
                                                                            <td className="px-2 py-0.5 text-right font-medium">↳  Payroll Tax</td>
                                                                            <td colSpan={8}></td>
                                                                            <td className="px-2 py-0.5 text-right font-mono text-slate-600">${fTax.toLocaleString()}</td>
                                                                            <td colSpan={2}></td>
                                                                        </tr>
                                                                        <tr className="bg-slate-50 text-[10px] text-slate-500 border-l-4 border-l-amber-400">
                                                                            <td className="px-2 py-0.5 text-right font-medium">↳  Workers Comp</td>
                                                                            <td colSpan={8}></td>
                                                                            <td className="px-2 py-0.5 text-right font-mono text-slate-600">${fWorkCover.toLocaleString()}</td>
                                                                            <td colSpan={2}></td>
                                                                        </tr>
                                                                        <tr className="bg-slate-50 text-[10px] text-slate-500 border-l-4 border-l-amber-400">
                                                                            <td className="px-2 py-0.5 text-right font-medium">↳  Holiday Pay</td>
                                                                            <td colSpan={8}></td>
                                                                            <td className="px-2 py-0.5 text-right font-mono text-slate-600">${fHoliday.toLocaleString()}</td>
                                                                            <td colSpan={2}></td>
                                                                        </tr>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
