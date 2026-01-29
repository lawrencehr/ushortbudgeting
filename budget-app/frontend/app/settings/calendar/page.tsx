"use client"

import * as React from "react"
import { CalendarPicker } from "@/components/CalendarPicker"
import { Loader2, Save, AlertCircle, Clock, Check } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface PhaseData {
    defaultHours: number
    dates: string[] // ISO dates
}

interface CalendarResponse {
    phases: {
        preProd?: PhaseData
        shoot?: PhaseData
        postProd?: PhaseData
    }
    holidays: Array<{ date: string, name: string }>
    calendarDays: any[]
}

type PhaseType = 'preProd' | 'shoot' | 'postProd'

export default function CalendarSettingsPage() {
    const [projectId, setProjectId] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // State for phases
    const [phases, setPhases] = React.useState({
        preProd: { dates: [] as Date[], hours: 8 },
        shoot: { dates: [] as Date[], hours: 10 },
        postProd: { dates: [] as Date[], hours: 8 }
    })

    const [activePhase, setActivePhase] = React.useState<PhaseType>('shoot')
    const [holidays, setHolidays] = React.useState<Array<{ date: string, name: string }>>([])
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

    // Load Project and Calendar
    React.useEffect(() => {
        async function loadData() {
            try {
                // 1. Get Projects
                const projRes = await fetch('http://localhost:8000/api/projects')
                const projects = await projRes.json()
                if (!projects || projects.length === 0) {
                    setError("No active project found.")
                    setLoading(false)
                    return
                }

                const activeId = projects[0].id // Default to first for MVP
                setProjectId(activeId)

                // 2. Get Calendar
                const calRes = await fetch(`http://localhost:8000/api/projects/${activeId}/calendar`)
                if (calRes.ok) {
                    const calData: CalendarResponse = await calRes.json()

                    setPhases({
                        preProd: {
                            dates: calData.phases.preProd?.dates.map(d => new Date(d)) || [],
                            hours: calData.phases.preProd?.defaultHours || 8
                        },
                        shoot: {
                            dates: calData.phases.shoot?.dates.map(d => new Date(d)) || [],
                            hours: calData.phases.shoot?.defaultHours || 10
                        },
                        postProd: {
                            dates: calData.phases.postProd?.dates.map(d => new Date(d)) || [],
                            hours: calData.phases.postProd?.defaultHours || 8
                        }
                    })

                    setHolidays(calData.holidays || [])
                }

            } catch (err) {
                console.error(err)
                setError("Failed to load calendar data.")
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [])

    const handleSave = async () => {
        if (!projectId) return
        setSaving(true)
        setError(null)

        try {
            const payload = {
                phases: {
                    preProd: {
                        defaultHours: phases.preProd.hours,
                        dates: phases.preProd.dates.map(d => format(d, 'yyyy-MM-dd'))
                    },
                    shoot: {
                        defaultHours: phases.shoot.hours,
                        dates: phases.shoot.dates.map(d => format(d, 'yyyy-MM-dd'))
                    },
                    postProd: {
                        defaultHours: phases.postProd.hours,
                        dates: phases.postProd.dates.map(d => format(d, 'yyyy-MM-dd'))
                    }
                }
            }

            const res = await fetch(`http://localhost:8000/api/projects/${projectId}/calendar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to save calendar")

            // Refresh to get holidays
            const calRes = await fetch(`http://localhost:8000/api/projects/${projectId}/calendar`)
            const calData = await calRes.json()
            setHolidays(calData.holidays || [])

        } catch (err) {
            console.error(err)
            setError("Failed to save calendar.")
        } finally {
            setSaving(false)
        }
    }

    // Interaction Logic
    const handleDayClick = (day: Date, modifiers: any) => {
        // Check if day is already in the ACTIVE phase
        const isActivePhase = phases[activePhase].dates.some(d => d.toDateString() === day.toDateString())

        setPhases(prev => {
            const newPhases = { ...prev }

            // Remove from ALL phases first (to ensure no overlap)
            Object.keys(newPhases).forEach((key) => {
                const k = key as PhaseType
                newPhases[k].dates = newPhases[k].dates.filter(d => d.toDateString() !== day.toDateString())
            })

            // If it wasn't already in the active phase, add it
            // (If it WAS in the active phase, we just removed it above, effectively toggling off)
            if (!isActivePhase) {
                newPhases[activePhase].dates.push(day)
            }

            return newPhases
        })
    }

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Loading...</div>
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-gray-50">
            {/* Header */}
            <header className="flex-none px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Production Calendar</h1>
                    <p className="text-gray-500 text-sm">Configure production phases and dates.</p>
                </div>

                <div className="flex items-center gap-4">
                    {error && (
                        <div className="text-red-600 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !projectId}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="flex-1 overflow-hidden p-6 flex justify-center">
                <div className="grid grid-cols-[1fr_300px] divide-x divide-gray-200 overflow-hidden max-w-5xl w-full bg-white border border-gray-200 rounded-lg shadow-sm h-full max-h-[800px]">

                    {/* Left: Calendar */}
                    <div className="p-6 overflow-y-auto bg-white flex flex-col items-center justify-start pt-8">
                        <CalendarPicker
                            selected={undefined}
                            onSelect={() => { }}
                            modifiers={{
                                preProd: phases.preProd.dates,
                                shoot: phases.shoot.dates,
                                postProd: phases.postProd.dates,
                                holiday: holidays.map(h => new Date(h.date))
                            }}
                            modifiersClassNames={{
                                preProd: "bg-green-500 text-white hover:bg-green-600 hover:text-white rounded-full",
                                shoot: "bg-red-500 text-white hover:bg-red-600 hover:text-white rounded-full",
                                postProd: "bg-purple-500 text-white hover:bg-purple-600 hover:text-white rounded-full",
                                holiday: "bg-amber-100 text-amber-900 ring-1 ring-amber-400 rounded-full !font-bold !underline underline-offset-2 decoration-2",
                            }}
                            onDayClick={handleDayClick}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            className="bg-white border-none p-4"
                        />
                    </div>

                    {/* Right: Tools */}
                    <div className="bg-gray-50/50 p-6 space-y-6 overflow-y-auto border-l border-gray-100">
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Phase Tools</h3>
                            <div className="space-y-3">

                                {/* Pre-Prod Card */}
                                <button
                                    onClick={() => setActivePhase('preProd')}
                                    className={cn(
                                        "w-full text-left p-4 rounded-lg border transition-all relative group items-start",
                                        activePhase === 'preProd'
                                            ? "bg-white border-green-500 ring-1 ring-green-500/20 shadow-md"
                                            : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", activePhase === 'preProd' ? "bg-green-500 shadow-sm" : "bg-green-200")} />
                                            <span className={cn("font-medium text-sm", activePhase === 'preProd' ? "text-gray-900" : "text-gray-500")}>Pre-Production</span>
                                        </div>
                                        {activePhase === 'preProd' && <Check className="w-3 h-3 text-green-500" />}
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-gray-500">{phases.preProd.dates.length} days</div>
                                        <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1 border border-gray-200" onClick={e => e.stopPropagation()}>
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            <input
                                                type="number"
                                                value={phases.preProd.hours}
                                                onChange={(e) => setPhases(p => ({ ...p, preProd: { ...p.preProd, hours: parseFloat(e.target.value) || 0 } }))}
                                                className="w-8 bg-transparent text-xs text-right focus:outline-none text-gray-700"
                                            />
                                            <span className="text-[10px] text-gray-500">h</span>
                                        </div>
                                    </div>
                                </button>

                                {/* Shoot Card */}
                                <button
                                    onClick={() => setActivePhase('shoot')}
                                    className={cn(
                                        "w-full text-left p-4 rounded-lg border transition-all relative group",
                                        activePhase === 'shoot'
                                            ? "bg-white border-red-500 ring-1 ring-red-500/20 shadow-md"
                                            : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", activePhase === 'shoot' ? "bg-red-500 shadow-sm" : "bg-red-200")} />
                                            <span className={cn("font-medium text-sm", activePhase === 'shoot' ? "text-gray-900" : "text-gray-500")}>Shooting</span>
                                        </div>
                                        {activePhase === 'shoot' && <Check className="w-3 h-3 text-red-500" />}
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-gray-500">{phases.shoot.dates.length} days</div>
                                        <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1 border border-gray-200" onClick={e => e.stopPropagation()}>
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            <input
                                                type="number"
                                                value={phases.shoot.hours}
                                                onChange={(e) => setPhases(p => ({ ...p, shoot: { ...p.shoot, hours: parseFloat(e.target.value) || 0 } }))}
                                                className="w-8 bg-transparent text-xs text-right focus:outline-none text-gray-700"
                                            />
                                            <span className="text-[10px] text-gray-500">h</span>
                                        </div>
                                    </div>
                                </button>

                                {/* Post-Prod Card */}
                                <button
                                    onClick={() => setActivePhase('postProd')}
                                    className={cn(
                                        "w-full text-left p-4 rounded-lg border transition-all relative group",
                                        activePhase === 'postProd'
                                            ? "bg-white border-purple-500 ring-1 ring-purple-500/20 shadow-md"
                                            : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", activePhase === 'postProd' ? "bg-purple-500 shadow-sm" : "bg-purple-200")} />
                                            <span className={cn("font-medium text-sm", activePhase === 'postProd' ? "text-gray-900" : "text-gray-500")}>Post-Production</span>
                                        </div>
                                        {activePhase === 'postProd' && <Check className="w-3 h-3 text-purple-500" />}
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-xs text-gray-500">{phases.postProd.dates.length} days</div>
                                        <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1 border border-gray-200" onClick={e => e.stopPropagation()}>
                                            <Clock className="w-3 h-3 text-gray-400" />
                                            <input
                                                type="number"
                                                value={phases.postProd.hours}
                                                onChange={(e) => setPhases(p => ({ ...p, postProd: { ...p.postProd, hours: parseFloat(e.target.value) || 0 } }))}
                                                className="w-8 bg-transparent text-xs text-right focus:outline-none text-gray-700"
                                            />
                                            <span className="text-[10px] text-gray-500">h</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Holidays</h3>
                            <div className="space-y-2">
                                {holidays.filter(h => {
                                    const d = new Date(h.date);
                                    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                                }).length === 0 && <p className="text-xs text-gray-400 italic">No holidays in {format(currentMonth, 'MMMM')}.</p>}
                                {holidays.filter(h => {
                                    const d = new Date(h.date);
                                    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
                                }).map((h, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">{h.name}</span>
                                        <span className="text-gray-400 font-mono">{format(new Date(h.date), "dd MMM")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
