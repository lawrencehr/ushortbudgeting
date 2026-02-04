import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, Lock, Unlock, Check, Trash, Info, Calendar } from 'lucide-react';
import { BudgetLineItem, CatalogItem } from '@/lib/api';
import CasualToggle from './CasualToggle';
import { useLaborContextSafe, CalendarData } from '@/lib/labor-context';
import { calculateLineItemTotal } from '@/lib/labor-calculation';
import AwardRateSearchModal from './AwardRateSearchModal';
import { PhaseOverridePopover } from './PhaseOverridePopover';
import { cn } from '@/lib/utils';

interface Props {
    item: BudgetLineItem;
    // We pass a simplified update handler that takes partial updates
    onChange: (updates: Partial<BudgetLineItem>) => void;
    onDelete: () => void;
    onExpandInspector: () => void;
    // Optional: Trigger parent recalc if needed (though we try to handle it here)
    onRecalc?: (overrides?: Partial<BudgetLineItem>) => void;
}

export default function BudgetRow({ item, onChange, onDelete, onExpandInspector, onRecalc }: Props) {
    const isLabor = item.is_labor;
    const laborContext = useLaborContextSafe();
    const [isLookupOpen, setIsLookupOpen] = useState(false);
    const [isPhaseOverrideOpen, setIsPhaseOverrideOpen] = useState(false);

    // Portal Tooltip State
    const [tooltipPos, setTooltipPos] = useState<{ top: number, right: number } | null>(null);

    const handleTooltipEnter = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Position to the right-bottom of the element
        setTooltipPos({
            top: rect.bottom + 5,
            right: window.innerWidth - rect.right
        });
    };

    const handleTooltipLeave = () => {
        setTooltipPos(null);
    };

    // Derived phase data for the override tool
    const itemPhaseData = React.useMemo<CalendarData>(() => {
        const overrides = (item.phase_details as any) || {};
        const getPhaseData = (phase: 'preProd' | 'shoot' | 'postProd') => {
            const effective = laborContext?.getEffectivePhaseConfig(item.grouping_id, phase);
            return {
                defaultHours: overrides[phase]?.defaultHours ?? effective?.defaultHours ?? (phase === 'shoot' ? 10 : 8),
                // If inheriting (or no override), use effective dates (which cascades to global).
                // Only use override dates if explicitly not inheriting.
                dates: (overrides[phase]?.inherit !== false) ? effective?.dates ?? [] : overrides[phase]?.dates ?? [],
                inherit: overrides[phase]?.inherit ?? true
            };
        };
        return {
            preProd: getPhaseData('preProd'),
            shoot: getPhaseData('shoot'),
            postProd: getPhaseData('postProd')
        };
    }, [item.phase_details, item.grouping_id, laborContext]);

    // Base defaults for the line item (Group settings or Global if no group override)
    const defaultPhaseData = React.useMemo<CalendarData>(() => {
        const getPhaseData = (phase: 'preProd' | 'shoot' | 'postProd') => {
            const effective = laborContext?.getEffectivePhaseConfig(item.grouping_id, phase);
            return {
                defaultHours: effective?.defaultHours ?? (phase === 'shoot' ? 10 : 8),
                dates: effective?.dates ?? [],
                inherit: true
            };
        };
        return {
            preProd: getPhaseData('preProd'),
            shoot: getPhaseData('shoot'),
            postProd: getPhaseData('postProd')
        };
    }, [item.grouping_id, laborContext]);

    // Stateless / Controlled: Derive toggles directly from props
    const phases = {
        pre: (item.prep_qty || 0) > 0,
        shoot: (item.shoot_qty || 0) > 0,
        post: (item.post_qty || 0) > 0
    };

    const handlePhaseToggle = (phase: 'pre' | 'shoot' | 'post') => {
        const newState = !phases[phase];
        const updates = {
            [`${phase === 'pre' ? 'prep' : phase}_qty`]: newState ? 1 : 0
        };

        // When toggling ON, we set to 1. 
        onChange(updates);

        // Pass updates directly to recalc to avoid stale state in timeout
        if (onRecalc) onRecalc(updates);
    };

    const handleRateSelect = (rateItem: any) => {
        // User selected an award rate

        // Detect Casual Status
        const isCasual = rateItem.section_name?.toLowerCase().includes('casual') || rateItem.classification?.toLowerCase().includes('casual') || false;

        // Handle "Pre-loaded" Casual Rates (specifically Artists - Casual table)
        // If the table rate is already a Casual rate (25% loaded), we must strip it back to Base
        // so that the calculator (which adds 25%) doesn't double-dip.
        // Artists - Casual table (Section Name contains "Artists" and "Casual") usually implies 25% loaded.
        let effectiveRate = rateItem.hourly_rate;
        if (isCasual && rateItem.section_name?.includes('Artists')) {
            effectiveRate = rateItem.hourly_rate / 1.25;
        }

        const updates = {
            description: rateItem.classification,
            base_hourly_rate: effectiveRate,
            // User requested default unit to be /hr
            unit: 'hour',
            is_labor: true,
            // Setup Casual toggle automatically
            is_casual: isCasual,
            // We use 'award_classification_id' as a flag that this is locked/linked
            award_classification_id: rateItem.classification
        };

        setIsLookupOpen(false);

        // Pass updates to recalc handler to prevent race conditions
        if (onRecalc) {
            onRecalc(updates);
        } else {
            onChange(updates);
        }
    };

    const handleUnlock = () => {
        onChange({
            award_classification_id: undefined
        });
    };

    // Calculate Breakdown for Tooltip
    // We use backend data if available
    const tooltipData = React.useMemo(() => {
        // Backend Data available?
        if (item.breakdown_json) {
            try {
                const breakdown = JSON.parse(item.breakdown_json);
                const fringes = item.fringes_json ? JSON.parse(item.fringes_json) : null;
                // Determine type based on content or item.is_labor
                const type = item.is_labor ? 'labor' : 'material';
                return { type, breakdown, fringes };
            } catch (e) {
                // fall through
            }
        }
        return null;
    }, [item.breakdown_json, item.fringes_json, item.is_labor]);


    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-12 gap-2 items-center px-3 py-1.5 bg-white border-b border-indigo-50 hover:bg-slate-50 transition-colors group relative rounded-md"
        >
            {/* ... (Columns 1-4 are same) ... */}

            {/* 1. Description (Span 4) */}
            <div className="col-span-4 flex items-center gap-1 bg-white border border-transparent hover:border-indigo-100 rounded-md focus-within:ring-1 focus-within:ring-indigo-200 transition-all shadow-sm">
                <input
                    value={item.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="w-full text-xs font-medium text-slate-700 bg-transparent border-none focus:ring-0 px-2 py-1 placeholder-slate-300 truncate"
                    placeholder="Description..."
                />

                {/* Lookup Button */}
                <button
                    onClick={() => setIsLookupOpen(true)}
                    className="p-1 text-slate-300 hover:text-indigo-500 transition-colors mr-1"
                    title="Search Award Rates"
                >
                    <Search className="w-3 h-3" />
                </button>

                {item.crew_member_id && (
                    <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 mr-1 whitespace-nowrap">
                        LINKED
                    </span>
                )}
            </div>

            {/* 2. Rate & Unit (Span 2) */}
            <div className="col-span-2 flex gap-1 items-center">
                <div className="relative flex-1 group/rate">
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">$</span>

                    {/* Locked / Unlocked Indicator */}
                    {item.award_classification_id ? (
                        <button
                            onClick={handleUnlock}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-700 z-10"
                            title="Unlock Rate (Award Linked)"
                        >
                            <Lock className="w-2.5 h-2.5" />
                        </button>
                    ) : null}

                    <input
                        type="number"
                        value={item.rate || ''}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const updates: any = { rate: val };
                            if (isLabor && item.unit === 'hour') {
                                updates.base_hourly_rate = val;
                            }
                            onChange(updates);
                        }}
                        onBlur={() => {
                            if (onRecalc) {
                                onRecalc({ base_hourly_rate: parseFloat(item.rate as any) || 0 });
                            }
                        }}
                        disabled={!!item.award_classification_id}
                        className={`
                            w-full pl-3 pr-4 py-1 text-right text-xs font-mono bg-transparent border-b transition-all rounded-sm
                            ${item.award_classification_id
                                ? 'text-slate-500 border-dashed border-slate-300 bg-slate-50 cursor-not-allowed'
                                : 'text-slate-700 border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-0'}
                        `}
                        placeholder="0"
                    />
                </div>

                {/* Unit Selector */}
                <select
                    value={item.unit || 'day'}
                    onChange={(e) => {
                        const updates = { unit: e.target.value };
                        onChange(updates);
                        if (onRecalc) onRecalc(updates);
                    }}
                    disabled={!!item.award_classification_id}
                    className="w-14 text-[9px] text-slate-400 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-indigo-600 text-right pr-0 uppercase tracking-tighter font-bold disabled:opacity-50"
                >
                    <option value="day">DAY</option>
                    <option value="hour">HR</option>
                    <option value="week">WK</option>
                    <option value="allow">FLAT</option>
                </select>
            </div>

            {/* 3. Casual Toggle (Span 1) */}
            <div className="col-span-1 flex justify-center">
                {isLabor ? (
                    <CasualToggle
                        isCasual={item.is_casual || false}
                        disabled={!!item.award_classification_id}
                        onChange={(val) => {
                            const updates = { is_casual: val };
                            onChange(updates);
                            // Pass updates directly to recalc
                            if (onRecalc) onRecalc(updates);
                        }}
                    />
                ) : (
                    <span className="text-[10px] text-slate-300 italic">-</span>
                )}
            </div>

            {/* 4. Phases (Span 3) */}
            <div className="col-span-3 flex items-center justify-center gap-1 pr-2">
                {/* Pre */}
                <button
                    onClick={() => handlePhaseToggle('pre')}
                    className={`
                        px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm min-w-[32px]
                        ${phases.pre ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}
                    `}
                    title="Prep Phase"
                >
                    Pre
                </button>

                {/* Shoot */}
                <button
                    onClick={() => handlePhaseToggle('shoot')}
                    className={`
                        px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm min-w-[36px]
                        ${phases.shoot ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}
                    `}
                    title="Shoot Phase"
                >
                    Shoot
                </button>

                {/* Post */}
                <button
                    onClick={() => handlePhaseToggle('post')}
                    className={`
                        px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm min-w-[32px]
                        ${phases.post ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}
                    `}
                    title="Post Phase"
                >
                    Post
                </button>

                {/* Calendar Override */}
                <div className="relative">
                    <button
                        onClick={() => setIsPhaseOverrideOpen(!isPhaseOverrideOpen)}
                        className={cn(
                            "ml-1 p-1 rounded-full transition-colors",
                            isPhaseOverrideOpen || item.calendar_mode === 'custom'
                                ? "bg-amber-100 text-amber-600"
                                : "text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                        )}
                        title="Custom Calendar Override"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                    </button>

                    {isPhaseOverrideOpen && (
                        <PhaseOverridePopover
                            title={item.description || "Line Item Override"}
                            initialData={itemPhaseData}
                            defaultData={defaultPhaseData}
                            onSave={(updated) => {
                                const isDefault =
                                    updated.preProd?.inherit &&
                                    updated.shoot?.inherit &&
                                    updated.postProd?.inherit;

                                const updates = {
                                    phase_details: updated,
                                    calendar_mode: (isDefault ? 'inherit' : 'custom') as 'inherit' | 'custom'
                                };

                                onChange(updates);
                                setIsPhaseOverrideOpen(false);
                                // Trigger recalc explicitly with the new updates
                                if (onRecalc) onRecalc(updates);
                            }}
                            onClose={() => setIsPhaseOverrideOpen(false)}
                            className="right-0 top-full mt-2"
                        />
                    )}
                </div>
            </div>

            {/* 5. Total (Span 1) */}
            <div
                className="col-span-1 text-right relative group/total cursor-help"
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}
            >
                <span className="font-mono font-bold text-xs text-slate-800">
                    ${(item.total || 0).toLocaleString()}
                </span>

                {/* Portal Tooltip */}
                {tooltipPos && tooltipData && tooltipData.breakdown && createPortal(
                    <div
                        className="fixed z-[99999] pointer-events-none bg-slate-800 text-white text-[10px] p-3 rounded shadow-xl border border-white/10 ring-1 ring-black/5 text-left font-mono animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: tooltipPos.top, right: tooltipPos.right }}
                    >
                        {tooltipData.type === 'labor' ? (
                            <>
                                <div className="mb-2 font-bold border-b border-slate-600 pb-1 flex justify-between">
                                    <span>Total</span>
                                    {/* @ts-ignore */}
                                    <span>${(item.total || 0).toLocaleString()}</span>
                                </div>
                                <div className="space-y-1">
                                    {tooltipData.breakdown.preProd && (
                                        <div className="flex justify-between">
                                            <span className={!phases.pre ? 'text-slate-500 line-through' : 'text-green-300'}>├─ Prep ({tooltipData.breakdown.preProd.days}d)</span>
                                            {/* @ts-ignore */}
                                            <span>${tooltipData.breakdown.preProd.cost.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {tooltipData.breakdown.shoot && (
                                        <div className="flex justify-between">
                                            <span className={!phases.shoot ? 'text-slate-500 line-through' : 'text-red-300'}>├─ Shoot ({tooltipData.breakdown.shoot.days}d)</span>
                                            {/* @ts-ignore */}
                                            <span>${tooltipData.breakdown.shoot.cost.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {tooltipData.breakdown.postProd && (
                                        <div className="flex justify-between">
                                            <span className={!phases.post ? 'text-slate-500 line-through' : 'text-purple-300'}>└─ Post ({tooltipData.breakdown.postProd.days}d)</span>
                                            {/* @ts-ignore */}
                                            <span>${tooltipData.breakdown.postProd.cost.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Gross Pay Display */}
                                <div className="mt-2 pt-2 border-t border-slate-600/50">
                                    <div className="flex justify-between font-bold text-slate-200">
                                        <span>Gross Pay</span>
                                        {/* @ts-ignore */}
                                        <span>${((tooltipData.breakdown.preProd?.cost || 0) + (tooltipData.breakdown.shoot?.cost || 0) + (tooltipData.breakdown.postProd?.cost || 0)).toLocaleString()}</span>
                                    </div>
                                </div>

                                {tooltipData.fringes && (
                                    <div className="mt-2 pt-2 border-t border-slate-600/50">
                                        <div className="flex justify-between font-bold text-slate-300 mb-1">
                                            <span>Fringes</span>
                                            {/* @ts-ignore */}
                                            <span>${tooltipData.fringes.total_fringes.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-0.5 text-slate-400 pl-2">
                                            <div className="flex justify-between"><span>Super</span> <span>${tooltipData.fringes.super.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>Hol Pay</span> <span>${tooltipData.fringes.holiday_pay.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>Tax</span> <span>${tooltipData.fringes.payroll_tax.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span>Comp</span> <span>${tooltipData.fringes.workers_comp.toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Material Breakdown
                            <>
                                <div className="mb-2 font-bold border-b border-slate-600 pb-1 flex justify-between items-center">
                                    <span className="text-slate-100">Period Cost ({item.unit})</span>
                                    <span className="text-white">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>

                                <div className="space-y-1">
                                    {/* Prep - Helper to check 'pre' or 'preProd' for robustness */}
                                    {(tooltipData.breakdown.pre || tooltipData.breakdown.preProd) && (
                                        <div className="flex justify-between">
                                            <span className={!phases.pre ? 'text-slate-600 line-through decoration-slate-600' : 'text-green-300'}>
                                                {/* @ts-ignore */}
                                                ├─ Prep ({(tooltipData.breakdown.pre || tooltipData.breakdown.preProd).days}d)
                                            </span>
                                            <span className={!phases.pre ? 'text-slate-700' : 'text-slate-200'}>
                                                {/* @ts-ignore */}
                                                ${(tooltipData.breakdown.pre || tooltipData.breakdown.preProd).cost.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {(tooltipData.breakdown.shoot || tooltipData.breakdown.shoot) && (
                                        <div className="flex justify-between">
                                            <span className={!phases.shoot ? 'text-slate-600 line-through decoration-slate-600' : 'text-red-300'}>
                                                {/* @ts-ignore */}
                                                ├─ Shoot ({(tooltipData.breakdown.shoot).days}d)
                                            </span>
                                            <span className={!phases.shoot ? 'text-slate-700' : 'text-slate-200'}>
                                                {/* @ts-ignore */}
                                                ${(tooltipData.breakdown.shoot).cost.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {(tooltipData.breakdown.post || tooltipData.breakdown.postProd) && (
                                        <div className="flex justify-between">
                                            <span className={!phases.post ? 'text-slate-600 line-through decoration-slate-600' : 'text-purple-300'}>
                                                {/* @ts-ignore */}
                                                └─ Post ({(tooltipData.breakdown.post || tooltipData.breakdown.postProd).days}d)
                                            </span>
                                            <span className={!phases.post ? 'text-slate-700' : 'text-slate-200'}>
                                                {/* @ts-ignore */}
                                                ${(tooltipData.breakdown.post || tooltipData.breakdown.postProd).cost.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>,
                    document.body
                )}
            </div>

            {/* 6. Options (Span 1) */}
            <div className="col-span-1 flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onExpandInspector}
                    className="p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition-colors"
                    title="View Details/Notes"
                >
                    <Info className="w-3 h-3" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                    title="Delete Item"
                >
                    <Trash className="w-3 h-3" />
                </button>
            </div>

            {/* Render Modal */}
            <AwardRateSearchModal
                isOpen={isLookupOpen}
                onClose={() => setIsLookupOpen(false)}
                onSelect={handleRateSelect}
            />
        </motion.div >
    );
}
