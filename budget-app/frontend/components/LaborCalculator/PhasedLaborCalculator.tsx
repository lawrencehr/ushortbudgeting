"use client";

import { useState, useEffect } from "react";
import { Calculator, Clock, Calendar, DollarSign } from "lucide-react";

export interface LaborPhase {
    name: "Prep" | "Shoot" | "Post";
    weeks: number;
    days_per_week: number;
    hours_per_day: number;
    base_rate: number; // Hourly
    // Calibration / Overrides (later)
    weekly_rate?: number;
    total_cost?: number;
}

interface PhasedLaborCalculatorProps {
    initialPhases?: LaborPhase[];
    initialBaseRate: number;
    onUpdate: (phases: LaborPhase[], total: number) => void;
}

const DEFAULT_PHASES: LaborPhase[] = [
    { name: "Prep", weeks: 0, days_per_week: 5, hours_per_day: 10, base_rate: 0 },
    { name: "Shoot", weeks: 0, days_per_week: 5, hours_per_day: 10, base_rate: 0 },
    { name: "Post", weeks: 0, days_per_week: 5, hours_per_day: 10, base_rate: 0 },
];

export default function PhasedLaborCalculator({ initialPhases, initialBaseRate, onUpdate }: PhasedLaborCalculatorProps) {
    const [phases, setPhases] = useState<LaborPhase[]>(() => {
        if (initialPhases && initialPhases.length > 0) return initialPhases;
        // Seed with default but use the passed base rate
        return DEFAULT_PHASES.map(p => ({ ...p, base_rate: initialBaseRate }));
    });

    const [grandTotal, setGrandTotal] = useState(0);

    // Calculation Logic
    useEffect(() => {
        const newPhases = [...phases];
        let total = 0;

        newPhases.forEach(p => {
            // Simple logic: (Base * Hours * Days) * Weeks
            // Note: This ignores OT rules for now to keep it MVP. Real OT requires the backend engine.
            // We can approximate casual loading or simple OT here if needed.
            // Let's assume flat hourly for MVP or strict 10h days.

            // Just use simple math for instant feedback
            const daily = p.base_rate * p.hours_per_day;
            const weekly = daily * p.days_per_week;
            p.weekly_rate = weekly;
            p.total_cost = weekly * p.weeks;
            total += p.total_cost;
        });

        setGrandTotal(total);
        // Only trigger update if something changed? 
        // We'll trust the parent to debounce or handle this.
        onUpdate(newPhases, total);
    }, [phases]); // Careful with dependency loop if onUpdate changes

    const handlePhaseChange = (index: number, field: keyof LaborPhase, value: number) => {
        const newPhases = [...phases];
        (newPhases[index] as any)[field] = value;
        setPhases(newPhases);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[1fr_80px_80px_80px_100px_100px] gap-2 text-xs font-semibold text-gray-500 mb-1 px-1">
                <div className="pl-2">Phase</div>
                <div className="text-center">Weeks</div>
                <div className="text-center">Days/Wk</div>
                <div className="text-center">Hrs/Day</div>
                <div className="text-right">Rate/Hr</div>
                <div className="text-right">Total</div>
            </div>

            {phases.map((phase, idx) => (
                <div key={phase.name} className="grid grid-cols-[1fr_80px_80px_80px_100px_100px] gap-2 items-center bg-white p-2 rounded border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
                    <div className="flex items-center gap-2 font-bold text-gray-700">
                        {/* Icons per phase */}
                        {phase.name === "Prep" && <Calendar size={14} className="text-amber-500" />}
                        {phase.name === "Shoot" && <div className="w-3.5 h-3.5 rounded-full bg-red-500" />}
                        {phase.name === "Post" && <Clock size={14} className="text-blue-500" />}
                        {phase.name}
                    </div>

                    <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={phase.weeks}
                        onChange={(e) => handlePhaseChange(idx, "weeks", parseFloat(e.target.value) || 0)}
                        className="text-center rounded border-gray-200 text-sm py-1 focus:ring-1 focus:ring-indigo-500"
                        placeholder="0"
                    />

                    <input
                        type="number"
                        min={0}
                        max={7}
                        value={phase.days_per_week}
                        onChange={(e) => handlePhaseChange(idx, "days_per_week", parseFloat(e.target.value) || 0)}
                        className="text-center rounded border-gray-200 text-sm py-1 focus:ring-1 focus:ring-indigo-500"
                    />

                    <input
                        type="number"
                        min={0}
                        max={24}
                        value={phase.hours_per_day}
                        onChange={(e) => handlePhaseChange(idx, "hours_per_day", parseFloat(e.target.value) || 0)}
                        className="text-center rounded border-gray-200 text-sm py-1 focus:ring-1 focus:ring-indigo-500"
                    />

                    <div className="relative">
                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                        <input
                            type="number"
                            min={0}
                            value={phase.base_rate}
                            onChange={(e) => handlePhaseChange(idx, "base_rate", parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 text-right rounded border-gray-200 text-sm py-1 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="text-right font-mono font-bold text-gray-900">
                        ${(phase.total_cost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            ))}

            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                <div className="text-gray-500 text-xs">
                    * Simple calculation: (Base × Hrs × Days) × Weeks. <br />
                    Does not include advanced overtime rules yet.
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase font-bold">Estimated Labor Total</div>
                    <div className="text-2xl font-bold text-indigo-700">${grandTotal.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );
}
