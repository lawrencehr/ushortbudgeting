"use client"

import * as React from "react"
import { CalendarPicker } from "./CalendarPicker"
import { format } from "date-fns"
import { ChevronDown, ChevronRight, Clock } from "lucide-react"

interface PhaseConfigurationProps {
    title: string
    color: string
    defaultHours: number
    selectedDates: Date[]
    onHoursChange: (hours: number) => void
    onDatesChange: (dates: Date[]) => void
    disabledDates?: Date[]
}

export function PhaseConfiguration({
    title,
    color,
    defaultHours,
    selectedDates,
    onHoursChange,
    onDatesChange,
    disabledDates
}: PhaseConfigurationProps) {
    const [isOpen, setIsOpen] = React.useState(true)

    return (
        <div className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden mb-4">
            <div
                className="flex items-center justify-between p-4 bg-zinc-900 cursor-pointer hover:bg-zinc-800/80 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                    <div className="flex flex-col">
                        <h3 className="font-medium text-zinc-200">{title}</h3>
                        <span className="text-xs text-zinc-500">{selectedDates.length} days selected</span>
                    </div>
                </div>

                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <input
                            type="number"
                            value={defaultHours}
                            onChange={(e) => onHoursChange(parseFloat(e.target.value) || 0)}
                            className="bg-transparent w-12 text-sm text-center text-zinc-200 focus:outline-none"
                            step={0.5}
                        />
                        <span className="text-xs text-zinc-500">hrs/day</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${color}`}></div>
                </div>
            </div>

            {isOpen && (
                <div className="p-4 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                    <CalendarPicker
                        selected={selectedDates}
                        onSelect={(dates) => onDatesChange(dates || [])}
                        disabled={disabledDates}
                        className="w-full max-w-md mx-auto"
                    />

                    {selectedDates.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-800">
                            <h4 className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Date Summary</h4>
                            <div className="flex flex-wrap gap-2">
                                {/* Simple summary - improvement: group consecutive dates */}
                                {selectedDates.slice(0, 5).map(d => (
                                    <span key={d.toISOString()} className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">
                                        {format(d, "MMM d")}
                                    </span>
                                ))}
                                {selectedDates.length > 5 && (
                                    <span className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-500">
                                        +{selectedDates.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
