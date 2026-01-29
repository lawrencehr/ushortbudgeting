"use client"

import * as React from "react"
import { CalendarPicker } from "./CalendarPicker"
import { Loader2, Save, X, Clock, Check, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useLaborContext, PhaseConfig, CalendarData } from "@/lib/labor-context"

interface PhaseOverridePopoverProps {
    title: string;
    initialData: CalendarData;
    onSave: (data: CalendarData) => void;
    onClose: () => void;
    className?: string; // Flexible positioning
}

type PhaseType = 'preProd' | 'shoot' | 'postProd'

export function PhaseOverridePopover({ title, initialData, onSave, onClose, className }: PhaseOverridePopoverProps) {
    const { projectCalendar } = useLaborContext()

    // State for phases
    const [phases, setPhases] = React.useState<CalendarData>(() => {
        // Ensure dates are specialized as Date objects for the picker if they come as strings
        return {
            preProd: {
                ...initialData.preProd,
                dates: initialData.preProd.dates.map(d => typeof d === 'string' ? d : (d as any).toISOString ? (d as any).toISOString() : d)
            },
            shoot: {
                ...initialData.shoot,
                dates: initialData.shoot.dates.map(d => typeof d === 'string' ? d : (d as any).toISOString ? (d as any).toISOString() : d)
            },
            postProd: {
                ...initialData.postProd,
                dates: initialData.postProd.dates.map(d => typeof d === 'string' ? d : (d as any).toISOString ? (d as any).toISOString() : d)
            },
        }
    })

    const [activePhase, setActivePhase] = React.useState<PhaseType>('shoot')
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

    const handleDayClick = (day: Date) => {
        const dateStr = day.toISOString()
        const dayString = day.toDateString()

        setPhases(prev => {
            const newPhases = { ...prev }
            const currentPhaseDates = [...newPhases[activePhase].dates]

            // Check if day is already in the ACTIVE phase
            const existingIdx = currentPhaseDates.findIndex(d => new Date(d).toDateString() === dayString)

            if (existingIdx !== -1) {
                // Remove it
                currentPhaseDates.splice(existingIdx, 1)
            } else {
                // Add it
                currentPhaseDates.push(dateStr)
            }

            newPhases[activePhase] = {
                ...newPhases[activePhase],
                dates: currentPhaseDates,
                inherit: false // Explicitly set to false if we modified dates
            }

            return newPhases
        })
    }

    const handleSave = () => {
        onSave(phases)
        onClose()
    }

    // Convert string dates to Date objects for CalendarPicker
    const getPhaseDates = (phase: PhaseType) => phases[phase].dates.map(d => new Date(d))
    const getGlobalDates = (phase: PhaseType) => projectCalendar[phase].dates.map(d => new Date(d))

    return (
        <div className={cn(
            "absolute z-[100] w-[280px] bg-white border border-indigo-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
            className
        )}>
            {/* Header */}
            <header className="px-4 py-3 border-b border-indigo-50 bg-indigo-50/30 flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-indigo-900 uppercase">Phase Override</h3>
                    <p className="text-[10px] text-indigo-500 font-medium truncate w-48">{title}</p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-white rounded-full transition-colors">
                    <X className="w-3.5 h-3.5 text-indigo-400" />
                </button>
            </header>

            <div className="p-2 space-y-2">
                {/* Phase Selection Tabs */}
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {(['preProd', 'shoot', 'postProd'] as PhaseType[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setActivePhase(p)}
                            className={cn(
                                "flex-1 py-1 px-2 rounded-md text-[9px] font-bold transition-all uppercase tracking-wider",
                                activePhase === p
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {p === 'preProd' ? 'Pre' : p === 'postProd' ? 'Post' : 'Shoot'}
                        </button>
                    ))}
                </div>

                {/* Info Card */}
                <div className={cn(
                    "p-2.5 rounded-lg border transition-all flex items-center justify-between",
                    activePhase === 'preProd' ? "bg-green-50 border-green-100" :
                        activePhase === 'shoot' ? "bg-red-50 border-red-100" : "bg-purple-50 border-purple-100"
                )}>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full animate-pulse",
                                activePhase === 'preProd' ? "bg-green-500" :
                                    activePhase === 'shoot' ? "bg-red-500" : "bg-purple-500"
                            )} />
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                                {activePhase === 'preProd' ? 'Pre-Production' :
                                    activePhase === 'shoot' ? 'Shooting' : 'Post-Production'}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-500 ml-3">
                            {phases[activePhase].dates.length} custom days
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-slate-200 shadow-sm">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        <input
                            type="number"
                            value={phases[activePhase].defaultHours}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                setPhases(prev => ({
                                    ...prev,
                                    [activePhase]: { ...prev[activePhase], defaultHours: val, inherit: false }
                                }))
                            }}
                            className="w-6 bg-transparent text-[10px] text-right font-bold focus:outline-none text-slate-700"
                        />
                        <span className="text-[9px] text-slate-400">h</span>
                    </div>
                </div>

                {/* Mini Calendar */}
                <div className="bg-slate-50 rounded-lg p-1 border border-slate-100">
                    <CalendarPicker
                        compact={true}
                        selected={getPhaseDates(activePhase)}
                        onSelect={() => { }} // Controlled via onDayClick
                        onDayClick={handleDayClick}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        className="bg-transparent border-none p-0 shadow-none"
                        modifiers={{
                            globalPre: getGlobalDates('preProd'),
                            globalShoot: getGlobalDates('shoot'),
                            globalPost: getGlobalDates('postProd'),
                            // Current Active Phase Override
                            active: getPhaseDates(activePhase)
                        }}
                        modifiersClassNames={{
                            globalPre: "bg-green-100 text-green-800 opacity-60 rounded-full",
                            globalShoot: "bg-red-100 text-red-800 opacity-60 rounded-full",
                            globalPost: "bg-purple-100 text-purple-800 opacity-60 rounded-full",
                            active: activePhase === 'preProd' ? "bg-green-500 text-white rounded-full !opacity-100 !ring-2 !ring-green-100" :
                                activePhase === 'shoot' ? "bg-red-500 text-white rounded-full !opacity-100 !ring-2 !ring-red-100" :
                                    "bg-purple-500 text-white rounded-full !opacity-100 !ring-2 !ring-purple-100"
                        }}
                    />
                </div>

                {/* Global Indicator Legend */}
                <div className="flex items-center gap-3 px-1">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Global Dates</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            activePhase === 'preProd' ? "bg-green-500" :
                                activePhase === 'shoot' ? "bg-red-500" : "bg-purple-500"
                        )} />
                        <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Override</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 rounded-md transition-all uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md font-bold text-[10px] transition-all shadow-md shadow-indigo-100 uppercase tracking-wider"
                    >
                        <Save className="w-3 h-3" />
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    )
}
