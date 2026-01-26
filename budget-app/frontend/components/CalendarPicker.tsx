"use client"

import * as React from "react"
import { DayPicker, DayClickEventHandler } from "react-day-picker"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
// import "react-day-picker/dist/style.css" // We will use custom tailwind styles or import in layout

interface CalendarPickerProps {
    selected: Date[] | undefined
    onSelect: (days: Date[] | undefined) => void
    disabled?: Date[]
    modifiers?: Record<string, Date[]>
    modifierStyles?: Record<string, React.CSSProperties>
    className?: string
}

export function CalendarPicker({
    selected,
    onSelect,
    disabled,
    modifiers,
    modifierStyles,
    className,
}: CalendarPickerProps) {

    return (
        <div className={cn("p-4 bg-zinc-900 border border-zinc-800 rounded-lg", className)}>
            <DayPicker
                mode="multiple"
                selected={selected}
                onSelect={onSelect}
                disabled={disabled}
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
                showOutsideDays
                className="p-3"
                classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium text-zinc-100",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-zinc-400 hover:text-white transition-opacity",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-zinc-500 rounded-md w-9 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-zinc-800 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md transition-colors text-zinc-300",
                    day_selected:
                        "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                    day_today: "bg-zinc-800 text-zinc-100",
                    day_outside: "text-zinc-600 opacity-50",
                    day_disabled: "text-zinc-600 opacity-50",
                    day_range_middle: "aria-selected:bg-zinc-800 aria-selected:text-zinc-100",
                    day_hidden: "invisible",
                }}
            />
            <div className="mt-4 flex gap-4 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span>Selected</span>
                </div>
                {/* Add legend items dynamically if needed */}
            </div>
        </div>
    )
}
