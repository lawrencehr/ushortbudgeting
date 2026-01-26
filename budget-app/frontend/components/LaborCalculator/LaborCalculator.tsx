import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Plus, Trash2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
export type LaborMode = 'simple' | 'detailed';

export interface Allowance {
    id: string;
    name: string;
    amount: number;
    frequency: 'daily' | 'weekly';
}

export interface LaborCalculatorProps {
    initialMode?: LaborMode;
    initialBaseRate?: number;
    initialHours?: number;
    initialDays?: number;
    initialAllowances?: Allowance[];
    isCasual?: boolean;
    onRateChange?: (weeklyRate: number, details: any) => void;
    onStateChange?: (state: any) => void;
}

// --- Components ---

export default function LaborCalculator({
    initialMode = 'simple',
    initialBaseRate = 50,
    initialHours = 10,
    initialDays = 5,
    initialAllowances = [],
    isCasual: initialCasual = false,
    onRateChange,
    onStateChange,
}: LaborCalculatorProps) {
    const [mode, setMode] = useState<LaborMode>(initialMode);

    // State
    const [baseRate, setBaseRate] = useState(initialBaseRate);
    const [hours, setHours] = useState(initialHours);
    const [days, setDays] = useState(initialDays);
    const [isCasual, setIsCasual] = useState(initialCasual);
    const [allowances, setAllowances] = useState<Allowance[]>(initialAllowances);

    // Sync external props if they change (optional, but good for Reset/Load)
    React.useEffect(() => {
        setBaseRate(initialBaseRate);
        setHours(initialHours);
        setDays(initialDays);
        setIsCasual(initialCasual);
        setAllowances(initialAllowances || []);
    }, [initialBaseRate, initialHours, initialDays, initialCasual, initialAllowances]);

    // Constants
    const OT_15_THRESHOLD = 8;
    const OT_20_THRESHOLD = 10;

    // --- Calculations ---
    const breakdown = useMemo(() => {
        // 1. Base Hours (1x)
        const baseHours = Math.min(hours, OT_15_THRESHOLD);

        // 2. 1.5x Hours
        const ot15Hours = Math.max(0, Math.min(hours - OT_15_THRESHOLD, OT_20_THRESHOLD - OT_15_THRESHOLD));

        // 3. 2.0x Hours
        const ot20Hours = Math.max(0, hours - OT_20_THRESHOLD);

        // Daily Total (excluding allowances)
        let dailyPay = (baseHours * baseRate) + (ot15Hours * baseRate * 1.5) + (ot20Hours * baseRate * 2.0);

        // Casual Loading
        if (isCasual) {
            dailyPay *= 1.25;
        }

        // Weekly Calculations
        let weeklyPay = dailyPay * days;

        // Allowances
        const weeklyAllowances = allowances.reduce((sum, allow) => {
            if (allow.frequency === 'daily') return sum + (allow.amount * days);
            return sum + allow.amount;
        }, 0);

        weeklyPay += weeklyAllowances;

        return {
            baseHours,
            ot15Hours,
            ot20Hours,
            dailyPay,
            weeklyPay,
            weeklyAllowances,
            allowancesData: allowances // Pass back the raw list
        };
    }, [baseRate, hours, days, isCasual, allowances]);

    // Notify parent
    React.useEffect(() => {
        if (onRateChange) {
            onRateChange(breakdown.weeklyPay, breakdown);
        }
        if (onStateChange) {
            onStateChange({
                baseRate,
                hours,
                days,
                isCasual,
                allowances
            });
        }
    }, [breakdown, onRateChange, onStateChange]);

    // --- Actions ---
    const addAllowance = () => {
        setAllowances([
            ...allowances,
            { id: Math.random().toString(36).substr(2, 9), name: 'Meal Allowance', amount: 25, frequency: 'daily' }
        ]);
    };

    const removeAllowance = (id: string) => {
        setAllowances(allowances.filter(a => a.id !== id));
    };

    const updateAllowance = (id: string, updates: Partial<Allowance>) => {
        setAllowances(allowances.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    // --- Visuals ---
    // Determine max width for the bar (at least 12h for scale)
    const maxScaleHours = Math.max(12, hours);
    const getPercent = (h: number) => (h / maxScaleHours) * 100;

    return (
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Calculator size={16} className="text-indigo-600" />
                    Labor Calculator
                </h2>

                {/* Mode Toggle */}
                <div className="flex bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => setMode('simple')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            mode === 'simple' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Simple
                    </button>
                    <button
                        onClick={() => setMode('detailed')}
                        className={cn(
                            "px-3 py-1 text-xs font-medium rounded-md transition-all",
                            mode === 'detailed' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Detailed
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {/* Core Inputs */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Hourly Rate</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                            <input
                                type="number"
                                value={baseRate}
                                onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)}
                                className="w-full pl-6 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">Days / Week</label>
                        <input
                            type="number"
                            value={days}
                            onChange={(e) => setDays(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                        />
                    </div>
                </div>

                {/* Dynamic Section based on Mode */}
                <AnimatePresence mode="wait">
                    {mode === 'simple' ? (
                        <motion.div
                            key="simple"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">Total Weekly Rate (Manual Override)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        value={breakdown.weeklyPay}
                                        readOnly
                                        className="w-full pl-6 pr-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed font-mono text-sm"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400">Switch to Detailed mode to calculate overtime breakdown.</p>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detailed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Hours Input & Overtime Visualizer */}
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Daily Hours</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={hours}
                                            onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-bold text-indigo-900"
                                        />
                                        <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">hrs</span>
                                    </div>
                                </div>

                                <div className="relative h-6 mt-2 select-none group rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                    <div className="absolute inset-x-0 inset-y-0 flex">
                                        <div style={{ width: `${getPercent(breakdown.baseHours)}%` }} className="h-full bg-emerald-400 border-r border-white/20" title="1x" />
                                        <div style={{ width: `${getPercent(breakdown.ot15Hours)}%` }} className="h-full bg-amber-400 border-r border-white/20" title="1.5x" />
                                        <div style={{ width: `${getPercent(breakdown.ot20Hours)}%` }} className="h-full bg-rose-500" title="2.0x" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span>1.0x</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span>1.5x</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span>2.0x</span></div>
                                </div>
                            </div>

                            {/* Allowances */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-gray-700">Allowances</label>
                                    <button onClick={addAllowance} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1 transition-colors">
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {allowances.map((allow) => (
                                            <motion.div
                                                key={allow.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex gap-2 items-center"
                                            >
                                                <input
                                                    className="flex-1 min-w-0 px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:border-indigo-500 outline-none"
                                                    placeholder="Name"
                                                    value={allow.name}
                                                    onChange={(e) => updateAllowance(allow.id, { name: e.target.value })}
                                                />
                                                <div className="w-20 relative">
                                                    <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-4 pr-1 py-1.5 bg-white border border-gray-200 rounded text-xs text-right focus:border-indigo-500 outline-none"
                                                        value={allow.amount}
                                                        onChange={(e) => updateAllowance(allow.id, { amount: parseFloat(e.target.value) || 0 })}
                                                    />
                                                </div>
                                                <select
                                                    className="w-20 px-1 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:border-indigo-500 outline-none"
                                                    value={allow.frequency}
                                                    onChange={(e) => updateAllowance(allow.id, { frequency: e.target.value as any })}
                                                >
                                                    <option value="daily">/ Day</option>
                                                    <option value="weekly">/ Wk</option>
                                                </select>
                                                <button onClick={() => removeAllowance(allow.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {allowances.length === 0 && <div className="text-center py-2 text-xs text-gray-400 italic bg-gray-50/50 rounded border border-dashed border-gray-200">No allowances added</div>}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Total Footer */}
                <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-600">Total Weekly</span>
                        <span className="text-xl font-bold text-gray-900">${breakdown.weeklyPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {mode === 'detailed' && (
                        <div className="text-[10px] text-gray-400 text-right flex flex-col gap-0.5">
                            <span>Base: ${(breakdown.weeklyPay - breakdown.weeklyAllowances).toLocaleString()}</span>
                            <span>Allows: ${breakdown.weeklyAllowances.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
