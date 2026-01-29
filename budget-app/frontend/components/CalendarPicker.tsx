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
    modifiersClassNames?: Record<string, string>
    onDayClick?: DayClickEventHandler
    month?: Date
    onMonthChange?: (month: Date) => void
    className?: string
    compact?: boolean
}

export function CalendarPicker({
    selected,
    onSelect,
    disabled,
    modifiers,
    modifierStyles,
    modifiersClassNames,
    onDayClick,
    month,
    onMonthChange,
    className,
    compact = false, // Default to normal size
}: CalendarPickerProps) {

    return (
        <div className={cn("bg-white border border-gray-200 rounded-lg shadow-sm", className, compact ? "p-2" : "p-4")}>
            <DayPicker
                mode="multiple"
                weekStartsOn={1}
                selected={selected}
                onSelect={onSelect}
                onDayClick={onDayClick}
                month={month}
                onMonthChange={onMonthChange}
                disabled={disabled}
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
                modifiersClassNames={modifiersClassNames}
                showOutsideDays
                className={compact ? "p-0" : "p-3"}
                classNames={{
                    month_caption: compact ? "flex justify-center pt-1 mb-2 relative items-center" : "flex justify-center pt-1 mb-8 relative items-center",
                    caption_label: compact ? "text-sm font-bold text-gray-900" : "text-lg font-semibold text-gray-900",
                    nav: "space-x-1 flex items-center",
                    button_previous: compact ? "absolute left-0 h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-400" : "absolute left-1 h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-400",
                    button_next: compact ? "absolute right-0 h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-400" : "absolute right-1 h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-400",
                    month_grid: "w-full border-collapse",
                    weekdays: compact ? "flex mb-1 justify-between" : "flex mb-4 gap-2",
                    weekday: compact ? "text-gray-400 w-8 h-8 flex items-center justify-center font-bold text-[10px] uppercase tracking-tighter" : "text-gray-500 w-14 h-14 flex items-center justify-center font-medium text-sm uppercase tracking-wider",
                    week: compact ? "flex w-full mt-0 justify-between" : "flex w-full mt-2 gap-2",
                    day: compact ? "relative p-0 h-8 w-8 flex items-center justify-center text-[10px]" : "relative p-0 h-14 w-14 flex items-center justify-center", // The TD container
                    day_button: compact ? "h-7 w-7 p-0 rounded-full transition-all text-gray-900 flex items-center justify-center hover:bg-gray-100 focus:outline-none text-[10px]" : "h-12 w-12 p-0 rounded-full transition-all text-gray-900 flex items-center justify-center hover:bg-gray-100 focus:outline-none text-base", // The clickable button
                    today: "font-bold text-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30",
                    outside: "text-gray-300 opacity-40",
                    disabled: "text-gray-300 opacity-40",
                    hidden: "invisible",
                    selected: "bg-indigo-600 text-white hover:bg-indigo-700",
                }}
            />
        </div>
    )
}
