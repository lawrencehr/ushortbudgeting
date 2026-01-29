import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Lock, Unlock, Search, Calendar } from 'lucide-react';
import { CatalogItem } from '@/lib/api';
// We'll replace with real CatalogAutocomplete later, using dummy input for now
import CatalogAutocomplete from './CatalogAutocomplete';
import { useLaborContextSafe } from '@/lib/labor-context';
import { calculateLineItemTotal } from '@/lib/labor-calculation'; // Added import

export interface InlineItemData {
    description: string;
    rate: number;
    quantity: number; // For material simple mode
    prep_qty: number;
    shoot_qty: number;
    post_qty: number;
    unit: string;
    total: number;
    is_labor: boolean;
    base_rate: number;
    days_per_week: number;
    daily_hours: number;
    grouping_id?: string;
    // Labor V2
    calendar_mode?: 'inherit' | 'custom';
    phase_details?: Record<string, any>;
    award_classification_id?: string;
    role_history_id?: string;
}

interface Props {
    initialData?: Partial<InlineItemData>;
    isLabor: boolean;
    groupingId?: string; // Need grouping ID for context inheritance
    onSave: (data: InlineItemData) => void;
    onCancel: () => void;
}

export default function InlineItemEditor({ initialData, isLabor, groupingId, onSave, onCancel }: Props) {
    // --- Context ---
    // Unconditional Hook Call (Safe Version)
    const laborContext = useLaborContextSafe();

    // Only use if isLabor is true (logic check, not hook check)
    const effectiveContext = isLabor ? laborContext : null;

    // --- State ---
    const [description, setDescription] = useState(initialData?.description || '');

    // Amounts
    const [rate, setRate] = useState<string>(initialData?.rate?.toString() || '0');
    const [baseRate, setBaseRate] = useState<string>(initialData?.base_rate?.toString() || '0');
    const [isLocked, setIsLocked] = useState(!!initialData?.award_classification_id);

    // Quantities
    const [prepQty, setPrepQty] = useState<string>(initialData?.prep_qty?.toString() || '0');
    const [shootQty, setShootQty] = useState<string>(initialData?.shoot_qty?.toString() || '0');
    const [postQty, setPostQty] = useState<string>(initialData?.post_qty?.toString() || '0');
    const [quantity, setQuantity] = useState<string>(initialData?.quantity?.toString() || '1'); // For simple mode

    // Labor V2 State
    const [unit, setUnit] = useState(initialData?.unit || 'day');
    const [activePhases, setActivePhases] = useState({
        pre: initialData?.prep_qty ? initialData.prep_qty > 0 : false,
        shoot: initialData?.shoot_qty ? initialData.shoot_qty > 0 : true,
        post: initialData?.post_qty ? initialData.post_qty > 0 : false
    });

    // Labor Details
    const [daysPerWeek, setDaysPerWeek] = useState<string>(initialData?.days_per_week?.toString() || '5');
    const [dailyHours, setDailyHours] = useState<string>(initialData?.daily_hours?.toString() || '10');

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});



    // ... inside component ...

    // --- Derived ---
    // --- Derived ---
    const calculationResult = React.useMemo(() => {
        const r = parseFloat(rate) || 0;
        const hourlyRate = r;

        if (isLabor && effectiveContext) {
            // Real Logic via Engine
            // Resolve Configs
            const phaseConfigs = {
                pre: effectiveContext.getEffectivePhaseConfig(groupingId, 'preProd'),
                shoot: effectiveContext.getEffectivePhaseConfig(groupingId, 'shoot'),
                post: effectiveContext.getEffectivePhaseConfig(groupingId, 'postProd'),
            };

            const res = calculateLineItemTotal({
                rate: hourlyRate,
                isCasual: false, // TODO: Add casual toggle to UI or prop
                categoryType: 'crew', // TODO: Derive from Category Parent
                activePhases: {
                    pre: activePhases.pre,
                    shoot: activePhases.shoot,
                    post: activePhases.post
                },
                phaseConfigs: phaseConfigs
            });

            // If unit is Allow/Flat, ignore above? Spec 6.1 says "Unit = Flat" overrides logic.
            if (unit === 'allow') return { grandTotal: r, breakdown: null };

            return { grandTotal: res.grandTotal, breakdown: res.breakdown };
        } else {
            // ... Material Fallback (unchanged) ...
            const totalQty = (parseFloat(prepQty) || 0) + (parseFloat(shootQty) || 0) + (parseFloat(postQty) || 0);
            let total = 0;
            if (totalQty === 0 && parseFloat(quantity) > 0) total = r * parseFloat(quantity);
            else total = r * totalQty;

            return { grandTotal: total, breakdown: null };
        }
    }, [rate, prepQty, shootQty, postQty, quantity, isLabor, activePhases, unit, effectiveContext, groupingId]);

    const totalDisplay = calculationResult.grandTotal;

    // --- Handlers ---
    const togglePhase = (phase: 'pre' | 'shoot' | 'post') => {
        setActivePhases(prev => ({ ...prev, [phase]: !prev[phase] }));
    };

    const handleSave = () => {
        // Validation
        const newErrors: Record<string, string> = {};
        if (!description || description.trim().length < 2) newErrors.description = "Min 2 chars";
        if ((parseFloat(rate) || 0) < 0) newErrors.rate = "Cannot be negative";

        setErrors(newErrors);
        setTouched({ description: true, rate: true });

        if (Object.keys(newErrors).length > 0) return;

        // Construct Payload
        const finalQty = 1; // Simplified for V2

        const data: InlineItemData = {
            description,
            rate: parseFloat(rate) || 0,
            quantity: finalQty,
            prep_qty: activePhases.pre ? 1 : 0, // Mock placeholders
            shoot_qty: activePhases.shoot ? 1 : 0,
            post_qty: activePhases.post ? 1 : 0,
            unit,
            total: totalDisplay,
            is_labor: isLabor,
            base_rate: parseFloat(baseRate) || 0,
            days_per_week: parseFloat(daysPerWeek) || 5,
            daily_hours: parseFloat(dailyHours) || 8,
            calendar_mode: initialData?.calendar_mode || 'inherit', // Preserve or Inherit
            phase_details: { active_phases: activePhases, ...initialData?.phase_details }, // Merge
            grouping_id: groupingId,
            award_classification_id: initialData?.award_classification_id,
            role_history_id: initialData?.role_history_id
        };

        onSave(data);
    };

    const onCatalogSelect = (item: CatalogItem) => {
        setDescription(item.description);
        setRate(item.default_rate.toString());
        if (isLabor) {
            setBaseRate(item.default_rate.toString());
            // Mock locking logic
            setIsLocked(true);
        }
        setErrors({});
    };

    // --- Render ---

    return (
        <div
            className={`grid grid-cols-12 gap-2 p-2 items-center rounded-md border border-indigo-200 bg-indigo-50 shadow-sm ring-1 ring-indigo-100 relative`}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                }
            }}
        >
            {/* Description Column (Span 4) */}
            <div className="col-span-4 flex gap-1 relative group">
                <CatalogAutocomplete
                    value={description}
                    onChange={setDescription}
                    onSelect={onCatalogSelect}
                    className={`${errors.description ? "border-red-300 ring-red-200" : "border-indigo-200 focus:ring-indigo-500"} w-full rounded-md shadow-sm`}
                    placeholder={isLabor ? "Labor Role..." : "Item Description..."}
                    autoFocus
                />

                {/* Lookup Button (V2) */}
                <button className="p-1.5 bg-white border border-indigo-200 text-indigo-500 rounded-md hover:bg-indigo-50 shadow-sm" title="Lookup Award/Role">
                    <Search className="w-4 h-4" />
                </button>

                {errors.description && (
                    <div className="absolute -bottom-5 left-0 text-[10px] text-red-500 flex items-center bg-white px-1 rounded shadow-sm border border-red-100 z-10">
                        <AlertCircle className="w-3 h-3 mr-1" /> {errors.description}
                    </div>
                )}
            </div>

            {/* Rate Column (Span 2) */}
            <div className="col-span-2 relative group flex gap-1">
                <div className={`flex items-center flex-1 bg-white border rounded resize-none ${errors.rate ? "border-red-300" : "border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500"} shadow-sm ${isLocked ? "bg-gray-100 text-gray-500" : ""}`}>
                    <span className="pl-2 text-gray-400 text-sm">$</span>
                    <input
                        type="number"
                        value={rate}
                        onChange={e => !isLocked && setRate(e.target.value)}
                        readOnly={isLocked}
                        className="w-full p-1 text-sm outline-none border-none bg-transparent font-mono text-right pr-1"
                        placeholder="0.00"
                    />
                </div>

                {/* Lock Button (V2) */}
                {isLabor && (
                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-1.5 rounded-md border shadow-sm transition-colors ${isLocked ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-indigo-400 border-indigo-100 hover:text-indigo-600'}`}
                        title={isLocked ? "Unlock Rate" : "Lock Rate"}
                    >
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            {/* Unit (Span 1) */}
            <div className="col-span-1">
                <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full text-xs border-none bg-transparent text-gray-500 outline-none cursor-pointer hover:text-indigo-600 text-right pr-2"
                >
                    <option value="day">/day</option>
                    <option value="week">/wk</option>
                    <option value="allow">flat</option>
                </select>
            </div>

            {/* Phase Selection (Span 3) - The Hybrid Toggles */}
            <div className="col-span-3 flex items-center gap-1 justify-center bg-white/40 rounded-lg p-0.5 border border-indigo-100/50">
                {isLabor ? (
                    <>
                        <motion.button
                            layout
                            onClick={() => togglePhase('pre')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm ${activePhases.pre ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                        >
                            Pre
                        </motion.button>
                        <motion.button
                            layout
                            onClick={() => togglePhase('shoot')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm ${activePhases.shoot ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                        >
                            Shoot
                        </motion.button>
                        <motion.button
                            layout
                            onClick={() => togglePhase('post')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border shadow-sm ${activePhases.post ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
                        >
                            Post
                        </motion.button>
                        <motion.button
                            className="ml-1 p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            whileHover={{ rotate: 15 }}
                            title="Custom Calendar"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                        </motion.button>
                    </>
                ) : (
                    // Material Fallback
                    <div className="flex gap-1 w-full">
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            className="w-full text-center text-sm bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none"
                            placeholder="Qty"
                        />
                    </div>
                )}
            </div>

            {/* Total (Span 1) */}
            <div className="col-span-1 text-right font-mono font-bold text-gray-700 px-0 flex items-center justify-end h-full text-sm relative group/total">
                ${totalDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}

                {/* Cost Breakdown Tooltip */}
                <AnimatePresence>
                    {calculationResult.breakdown && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full right-0 mb-3 w-56 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-lg shadow-xl p-3 z-50 hidden group-hover/total:block pointer-events-none border border-white/10"
                        >
                            <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
                                <span className="text-gray-400 font-medium">Base Pay</span>
                                <span className="font-mono">${calculationResult.breakdown.base.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span className="text-gray-400">Overtime</span>
                                <span className="text-amber-400 font-mono">${calculationResult.breakdown.overtime.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-800">
                                <span className="text-gray-400">Fringes (Super/Tax)</span>
                                <span className="text-blue-300 font-mono">${calculationResult.breakdown.fringes.totalOnCosts.toFixed(2)}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Actions (Span 1) */}
            <div className="col-span-1 flex justify-end gap-1 items-center">
                <button
                    onClick={handleSave}
                    className="p-1.5 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all transform active:scale-95"
                    title="Save (Enter)"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onCancel}
                    className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all transform active:scale-95"
                    title="Cancel (Esc)"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Inheritance Tooltip (Phase) */}
            {isLabor && activePhases.shoot && (
                <div className="absolute top-full left-[60%] mt-1 bg-white border border-indigo-200 shadow-lg rounded px-2 py-1 text-[10px] text-indigo-600 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    Inherited from Camera Dept
                </div>
            )}
        </div>
    );
}
