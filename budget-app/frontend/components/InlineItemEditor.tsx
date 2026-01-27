import React, { useState, useEffect, useRef } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { CatalogItem } from '@/lib/api';
// We'll replace with real CatalogAutocomplete later, using dummy input for now
import CatalogAutocomplete from './CatalogAutocomplete';

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
}

interface Props {
    initialData?: Partial<InlineItemData>;
    isLabor: boolean;
    onSave: (data: InlineItemData) => void;
    onCancel: () => void;
}

export default function InlineItemEditor({ initialData, isLabor, onSave, onCancel }: Props) {
    // --- State ---
    const [description, setDescription] = useState(initialData?.description || '');

    // Amounts
    const [rate, setRate] = useState<string>(initialData?.rate?.toString() || '0');
    const [baseRate, setBaseRate] = useState<string>(initialData?.base_rate?.toString() || '0');

    // Quantities
    const [prepQty, setPrepQty] = useState<string>(initialData?.prep_qty?.toString() || '0');
    const [shootQty, setShootQty] = useState<string>(initialData?.shoot_qty?.toString() || '0');
    const [postQty, setPostQty] = useState<string>(initialData?.post_qty?.toString() || '0');
    const [quantity, setQuantity] = useState<string>(initialData?.quantity?.toString() || '1'); // For simple mode

    // Labor Details
    const [daysPerWeek, setDaysPerWeek] = useState<string>(initialData?.days_per_week?.toString() || '5');
    const [dailyHours, setDailyHours] = useState<string>(initialData?.daily_hours?.toString() || '8');
    const [unit, setUnit] = useState(initialData?.unit || 'day');

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // --- Derived ---
    const calculatedTotal = React.useMemo(() => {
        const r = parseFloat(rate) || 0;
        if (isLabor) {
            // Labor total = rate * (prep + shoot + post) typically
            // Wait, rate is usually Weekly or Daily. 
            // If unit is day, total = rate * total_days.
            // If unit is week, total = rate * total_weeks.
            const totalQty = (parseFloat(prepQty) || 0) + (parseFloat(shootQty) || 0) + (parseFloat(postQty) || 0);
            return r * totalQty;
        } else {
            // Material total = rate * quantity
            // But wait! We also have prep/shoot/post for materials in some budgets? 
            // The LineItem model supports prep/shoot/post for everything in the Frontend logic typically.
            // But simpler Material inputs usually just ask for "Quantity x Rate".
            // Let's stick to the wireframe: "Material Row shows Description, Rate, Quantities".
            // If standard budget, we usually default to using the split quantities for everything to be safe.
            // But if simple mode is requested... let's support split for consistency unless specified otherwise.
            // Wireframe 3b says: "Description, Rate, Quantities". Plural. implying split.
            // However, many simple materials are just "1 Flat Fee".

            const totalQty = (parseFloat(prepQty) || 0) + (parseFloat(shootQty) || 0) + (parseFloat(postQty) || 0);
            // If totalQty is 0, maybe fallback to 'quantity' state?
            if (totalQty === 0 && parseFloat(quantity) > 0) {
                return r * parseFloat(quantity);
            }
            return r * totalQty;
        }
    }, [rate, prepQty, shootQty, postQty, quantity, isLabor]);

    // --- Handlers ---

    const handleSave = () => {
        // Validate
        const newErrors: Record<string, string> = {};
        if (!description || description.length < 2) newErrors.description = "Description required";
        if ((parseFloat(rate) || 0) < 0) newErrors.rate = "Invalid rate";

        setErrors(newErrors);
        setTouched({ description: true, rate: true });

        if (Object.keys(newErrors).length > 0) return;

        // Construct Payload
        const totalQty = (parseFloat(prepQty) || 0) + (parseFloat(shootQty) || 0) + (parseFloat(postQty) || 0);
        const finalQty = totalQty === 0 ? (parseFloat(quantity) || 0) : totalQty;

        const data: InlineItemData = {
            description,
            rate: parseFloat(rate) || 0,
            quantity: finalQty,
            prep_qty: parseFloat(prepQty) || 0,
            shoot_qty: parseFloat(shootQty) || 0,
            post_qty: parseFloat(postQty) || 0,
            unit,
            total: calculatedTotal,
            is_labor: isLabor,
            base_rate: parseFloat(baseRate) || 0,
            days_per_week: parseFloat(daysPerWeek) || 5,
            daily_hours: parseFloat(dailyHours) || 8
        };

        onSave(data);
    };

    const onCatalogSelect = (item: CatalogItem) => {
        setDescription(item.description);
        setRate(item.default_rate.toString());

        if (isLabor) {
            // Set defaults for labor items so calculation works immediately
            setBaseRate(item.default_rate.toString());
            setDaysPerWeek('5');
            setDailyHours('10'); // Industry standard usually 10 for crew? Or 8? Let's use 10 as safe default or 8? App usually defaults to 10h days.
        }

        setErrors({});
    };

    // --- Render ---

    return (
        <div className={`grid grid-cols-12 gap-2 p-2 items-center rounded-md border border-indigo-200 bg-indigo-50 animate-in fade-in slide-in-from-top-1 duration-200`}>

            {/* Description Column (Span 4) */}
            <div className="col-span-4 relative">
                <CatalogAutocomplete
                    value={description}
                    onChange={setDescription}
                    onSelect={onCatalogSelect}
                    className={errors.description ? "border-red-300 focus:ring-red-200" : ""}
                    placeholder={isLabor ? "Labor Role..." : "Item Description..."}
                    autoFocus
                />
                {errors.description && (
                    <div className="absolute -bottom-5 left-0 text-xs text-red-500 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> {errors.description}
                    </div>
                )}
            </div>

            {/* Rate Column (Span 2) */}
            <div className="col-span-2 relative">
                <div className="flex items-center bg-white border rounded border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500">
                    <span className="pl-2 text-gray-400 text-sm">$</span>
                    <input
                        type="number"
                        value={rate}
                        onChange={e => setRate(e.target.value)}
                        className="w-full p-1 text-sm outline-none border-none bg-transparent"
                        placeholder="0.00"
                    />
                    <select
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="text-xs bg-transparent text-gray-500 border-l border-gray-200 ml-1 py-1 pr-1 outline-none"
                        title="Unit"
                    >
                        <option value="day">/day</option>
                        <option value="week">/wk</option>
                        <option value="allow">flat</option>
                    </select>
                </div>
            </div>

            {/* Quantities (Prep/Shoot/Post) (Span 3) */}
            <div className="col-span-3 flex gap-1">
                <input
                    type="number"
                    value={prepQty}
                    onChange={e => setPrepQty(e.target.value)}
                    className="w-full border rounded p-1 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Prep"
                    title="Prep Quantity"
                />
                <input
                    type="number"
                    value={shootQty}
                    onChange={e => setShootQty(e.target.value)}
                    className="w-full border rounded p-1 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Shoot"
                    title="Shoot Quantity"
                />
                <input
                    type="number"
                    value={postQty}
                    onChange={e => setPostQty(e.target.value)}
                    className="w-full border rounded p-1 text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Post"
                    title="Post Quantity"
                />
            </div>

            {/* Total (Span 2) */}
            <div className="col-span-2 text-right font-medium text-gray-700 px-2">
                ${calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Actions (Span 1) */}
            <div className="col-span-1 flex justify-end gap-1">
                <button
                    onClick={handleSave}
                    className="p-1 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                    title="Save"
                >
                    <Check className="w-5 h-5" />
                </button>
                <button
                    onClick={onCancel}
                    className="p-1 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                    title="Cancel"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Expanded Labor Options (if Labor Modal) - Progressive check? */}
            {isLabor && (
                <div className="col-span-12 mt-2 pt-2 border-t border-indigo-100 flex gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <label>Base Rate:</label>
                        <input type="number"
                            value={baseRate}
                            onChange={e => setBaseRate(e.target.value)}
                            className="w-16 border rounded px-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label>Days/Wk:</label>
                        <input type="number"
                            value={daysPerWeek}
                            onChange={e => setDaysPerWeek(e.target.value)}
                            className="w-12 border rounded px-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label>Hrs/Day:</label>
                        <input type="number"
                            value={dailyHours}
                            onChange={e => setDailyHours(e.target.value)}
                            className="w-12 border rounded px-1"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
