import { useState, useEffect } from "react";
import { ShiftInput } from "@/lib/api";
import { Plus, Trash2, Calendar } from "lucide-react";

interface ShiftSchedulerProps {
    shifts: ShiftInput[];
    baseRate: number;
    onChange: (shifts: ShiftInput[]) => void;
}

export default function ShiftScheduler({ shifts, baseRate, onChange }: ShiftSchedulerProps) {
    const [localShifts, setLocalShifts] = useState<ShiftInput[]>(shifts);

    useEffect(() => {
        setLocalShifts(shifts);
    }, [shifts]);

    const addShift = (type: string) => {
        const newShift: ShiftInput = {
            type,
            hours: 10,
            count: 1
        };
        const updated = [...localShifts, newShift];
        setLocalShifts(updated);
        onChange(updated);
    };

    const removeShift = (idx: number) => {
        const updated = localShifts.filter((_, i) => i !== idx);
        setLocalShifts(updated);
        onChange(updated);
    };

    const updateShift = (idx: number, updates: Partial<ShiftInput>) => {
        const updated = [...localShifts];
        updated[idx] = { ...updated[idx], ...updates };
        setLocalShifts(updated);
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => addShift("Standard")} className="flex-1 bg-white border hover:bg-slate-50 text-slate-700 py-1.5 rounded text-xs font-medium">+ Std Day</button>
                <button onClick={() => addShift("Saturday")} className="flex-1 bg-white border hover:bg-orange-50 text-orange-700 py-1.5 rounded text-xs font-medium border-orange-200">+ Saturday</button>
                <button onClick={() => addShift("Sunday")} className="flex-1 bg-white border hover:bg-red-50 text-red-700 py-1.5 rounded text-xs font-medium border-red-200">+ Sunday</button>
                <button onClick={() => addShift("PublicHoliday")} className="flex-1 bg-white border hover:bg-purple-50 text-purple-700 py-1.5 rounded text-xs font-medium border-purple-200">+ P.H.</button>
            </div>

            <div className="space-y-2">
                {localShifts.length === 0 && (
                    <div className="text-center p-4 text-gray-400 text-xs italic border border-dashed rounded">
                        No specific shifts defined. Using generic "Days per Week".
                    </div>
                )}
                {localShifts.map((shift, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 shadow-sm">
                        <div className={`w-2 h-8 rounded-sm shrink-0 ${shift.type === 'Standard' ? 'bg-slate-300' :
                                shift.type === 'Saturday' ? 'bg-orange-400' :
                                    shift.type === 'Sunday' ? 'bg-red-500' : 'bg-purple-500'
                            }`} />

                        <div className="flex-1">
                            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{shift.type}</div>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-1.5 rounded border">
                                    <input
                                        type="number"
                                        value={shift.hours}
                                        onChange={(e) => updateShift(idx, { hours: parseFloat(e.target.value) })}
                                        className="w-8 bg-transparent border-none p-0 text-right font-mono focus:ring-0"
                                    />
                                    <span>hrs</span>
                                </label>
                                <span className="text-gray-300">×</span>
                                <label className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-1.5 rounded border">
                                    <input
                                        type="number"
                                        value={shift.count}
                                        onChange={(e) => updateShift(idx, { count: parseInt(e.target.value) })}
                                        className="w-8 bg-transparent border-none p-0 text-right font-mono focus:ring-0"
                                    />
                                    <span>days</span>
                                </label>
                            </div>
                        </div>

                        <button onClick={() => removeShift(idx)} className="text-gray-300 hover:text-red-500 p-1">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="text-[10px] text-gray-400 text-right">
                Total Hours: {localShifts.reduce((acc, s) => acc + (s.hours * s.count), 0).toFixed(1)}h / week
            </div>
        </div>
    );
}
