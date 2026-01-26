"use client"

import * as React from "react"
import { PhaseConfiguration } from "@/components/PhaseConfiguration"
import { Loader2, Save, AlertCircle } from "lucide-react"

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

export default function CalendarSettingsPage() {
    const [projectId, setProjectId] = React.useState<string | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // State for phases
    const [preProd, setPreProd] = React.useState<{ dates: Date[], hours: number }>({ dates: [], hours: 8 })
    const [shoot, setShoot] = React.useState<{ dates: Date[], hours: number }>({ dates: [], hours: 10 })
    const [postProd, setPostProd] = React.useState<{ dates: Date[], hours: number }>({ dates: [], hours: 8 })

    const [holidays, setHolidays] = React.useState<Array<{ date: string, name: string }>>([])

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

                    // Map Response to State
                    if (calData.phases.preProd) {
                        setPreProd({
                            dates: calData.phases.preProd.dates.map(d => new Date(d)),
                            hours: calData.phases.preProd.defaultHours
                        })
                    }
                    if (calData.phases.shoot) {
                        setShoot({
                            dates: calData.phases.shoot.dates.map(d => new Date(d)),
                            hours: calData.phases.shoot.defaultHours
                        })
                    }
                    if (calData.phases.postProd) {
                        setPostProd({
                            dates: calData.phases.postProd.dates.map(d => new Date(d)),
                            hours: calData.phases.postProd.defaultHours
                        })
                    }

                    // Set Holidays if any (for display eventually)
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
                        defaultHours: preProd.hours,
                        dates: preProd.dates.map(d => d.toISOString())
                    },
                    shoot: {
                        defaultHours: shoot.hours,
                        dates: shoot.dates.map(d => d.toISOString())
                    },
                    postProd: {
                        defaultHours: postProd.hours,
                        dates: postProd.dates.map(d => d.toISOString())
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

    // Prevent selecting same date in multiple phases?
    // We can calculate 'disabled' for each phase based on others.
    const allPre = new Set(preProd.dates.map(d => d.toDateString()))
    const allShoot = new Set(shoot.dates.map(d => d.toDateString()))
    const allPost = new Set(postProd.dates.map(d => d.toDateString()))

    // Disable logic
    // Pre cannot start after shoot?? No, allow flexibility.
    // Just disable checking other sets.

    if (loading) {
        return <div className="p-8 flex items-center justify-center text-zinc-500"><Loader2 className="animate-spin mr-2" /> Loading...</div>
    }

    return (
        <div className="p-8 max-w-5xl mx-auto pb-32">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 mb-2">Production Calendar</h1>
                    <p className="text-zinc-400">Configure production phases and dates. Holidays are automatically detected.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || !projectId}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </header>

            {error && (
                <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-md text-red-400 mb-6 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <PhaseConfiguration
                    title="Pre-Production"
                    color="bg-green-500"
                    defaultHours={preProd.hours}
                    selectedDates={preProd.dates}
                    onHoursChange={(h) => setPreProd(prev => ({ ...prev, hours: h }))}
                    onDatesChange={(d) => setPreProd(prev => ({ ...prev, dates: d }))}
                    disabledDates={[...shoot.dates, ...postProd.dates]}
                />

                <PhaseConfiguration
                    title="Shoot"
                    color="bg-red-500"
                    defaultHours={shoot.hours}
                    selectedDates={shoot.dates}
                    onHoursChange={(h) => setShoot(prev => ({ ...prev, hours: h }))}
                    onDatesChange={(d) => setShoot(prev => ({ ...prev, dates: d }))}
                    disabledDates={[...preProd.dates, ...postProd.dates]}
                />

                <PhaseConfiguration
                    title="Post-Production"
                    color="bg-purple-500"
                    defaultHours={postProd.hours}
                    selectedDates={postProd.dates}
                    onHoursChange={(h) => setPostProd(prev => ({ ...prev, hours: h }))}
                    onDatesChange={(d) => setPostProd(prev => ({ ...prev, dates: d }))}
                    disabledDates={[...preProd.dates, ...shoot.dates]}
                />
            </div>

            {holidays.length > 0 && (
                <div className="mt-8 border text-sm border-zinc-800 rounded-lg p-6 bg-zinc-900/50">
                    <h2 className="text-zinc-400 font-medium mb-4 flex items-center gap-2">
                        <span>NSW Public Holidays Detected</span>
                        <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">{holidays.length}</span>
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {holidays.map((h, i) => (
                            <div key={i} className="flex flex-col">
                                <span className="text-zinc-200 font-medium">{h.name}</span>
                                <span className="text-zinc-500 text-xs">{h.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}
