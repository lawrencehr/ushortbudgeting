import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Calculator, Check, AlertCircle, Calendar } from "lucide-react";
import { BudgetLineItem, calculateLaborRate, fetchCrew, CrewMember, ShiftInput, fetchProjects, fetchProjectPhases, ProjectPhase } from "@/lib/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import PhasedLaborCalculator, { LaborPhase } from "./LaborCalculator/PhasedLaborCalculator";
import ShiftScheduler from "./LaborCalculator/ShiftScheduler";
import { eachDayOfInterval, isSaturday, isSunday } from "date-fns";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InspectorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    item: BudgetLineItem | null;
    onUpdateItem: (updates: Partial<BudgetLineItem>) => void;
}

interface SearchResult {
    award: string;
    type: string;
    classification: string;
    base_rate: number;
    weekly_rate: number;
    score: number;
    full_label: string;
}

export default function InspectorPanel({ isOpen, onClose, item, onUpdateItem }: InspectorPanelProps) {
    const [activeTab, setActiveTab] = useState<"search" | "calculator" | "schedule">("search");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([]);

    // Crew State
    const [crewList, setCrewList] = useState<CrewMember[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchCrew().then(setCrewList).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === "schedule" && isOpen) {
            // Load phases for auto-complete
            fetchProjects().then(projects => {
                if (projects.length > 0) {
                    fetchProjectPhases(projects[0].id).then(setProjectPhases);
                }
            }).catch(e => console.error("Failed to load phases", e));
        }
    }, [activeTab, isOpen]);

    // Helper to parse phases
    const getPhases = () => {
        if (!item?.labor_phases_json) return undefined;
        try {
            return JSON.parse(item.labor_phases_json) as LaborPhase[];
        } catch {
            return undefined;
        }
    };

    // Helper to parse shifts
    const getShifts = () => {
        if (!item?.shifts_json) return [];
        try {
            return JSON.parse(item.shifts_json) as ShiftInput[];
        } catch {
            return [];
        }
    };

    const handleUpdateShifts = async (shifts: ShiftInput[]) => {
        if (!item) return;

        // Recalculate based on shifts
        try {
            const res = await calculateLaborRate(
                item.base_hourly_rate || 0,
                item.daily_hours || 0,
                item.days_per_week || 0,
                item.is_casual || false,
                undefined,
                undefined,
                item.allowances,
                shifts
            );

            onUpdateItem({
                shifts_json: JSON.stringify(shifts),
                rate: res.weekly_rate,
                fringes_json: JSON.stringify(res.fringes)
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleImportPhase = (phaseId: string) => {
        const phase = projectPhases.find(p => p.id === phaseId);
        if (!phase) return;

        const start = new Date(phase.start_date);
        const end = new Date(phase.end_date);
        const days = eachDayOfInterval({ start, end });

        // Grouping Counters
        let standard = 0;
        let saturday = 0;
        let sunday = 0;

        days.forEach(day => {
            if (isSunday(day)) sunday++;
            else if (isSaturday(day)) saturday++;
            else standard++;
        });

        const newShifts: ShiftInput[] = [];
        if (standard > 0) newShifts.push({ type: "Standard", hours: 10, count: standard });
        if (saturday > 0) newShifts.push({ type: "Saturday", hours: 10, count: saturday });
        if (sunday > 0) newShifts.push({ type: "Sunday", hours: 10, count: sunday });

        handleUpdateShifts(newShifts);
    };

    const handleLinkCrew = (member: CrewMember) => {
        onUpdateItem({
            description: `${member.name} (${member.role})`,
            base_hourly_rate: member.base_rate,
            crew_member_id: member.id,
            // Map member allowances to local format
            allowances: member.default_allowances.map(a => ({
                ...a,
                id: Math.random().toString(36).substr(2, 9) // Generate temp ID for calculator
            }))
        });
        setActiveTab("calculator"); // Switch to calculator to see details
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Perform Search
    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }
        setSearching(true);
        fetch(`http://localhost:8000/api/rates/search?q=${encodeURIComponent(debouncedQuery)}`)
            .then(res => res.json())
            .then(data => {
                setResults(data);
                setSearching(false);
            })
            .catch(err => {
                console.error(err);
                setSearching(false);
            });
    }, [debouncedQuery]);

    const handleSelectRate = async (rate: SearchResult) => {
        if (!item) return;

        // Update local base vars
        const updates: Partial<BudgetLineItem> = {
            base_hourly_rate: rate.base_rate,
            is_casual: rate.type.toLowerCase() === 'casual', // Auto-detect casual
            description: item.description || rate.classification, // Smart rename if empty? Optional.
        };

        // Recalculate Weekly
        try {
            const res = await calculateLaborRate(
                rate.base_rate,
                item.daily_hours || 10,
                item.days_per_week || 5,
                updates.is_casual || false
            );
            updates.rate = res.weekly_rate;
            onUpdateItem(updates);
        } catch (e) {
            console.error(e);
        }
    };

    if (!item) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-40"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
                    >
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Inspector</h2>
                                <div className="text-sm text-gray-500 truncate max-w-[300px]">{item.description || "Untitled Item"}</div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b">
                            <button
                                onClick={() => setActiveTab("search")}
                                className={cn("flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'search' ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-gray-600 hover:bg-gray-50")}
                            >
                                <Search size={16} /> Smart Lookup
                            </button>
                            <button
                                onClick={() => setActiveTab("calculator")}
                                className={cn("flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'calculator' ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-gray-600 hover:bg-gray-50")}
                            >
                                <Calculator size={16} /> Calculator
                            </button>
                            <button
                                onClick={() => setActiveTab("schedule")}
                                className={cn("flex-1 p-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors", activeTab === 'schedule' ? "border-indigo-600 text-indigo-600 bg-indigo-50" : "border-transparent text-gray-600 hover:bg-gray-50")}
                            >
                                <Calendar size={16} /> Schedule
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">

                            {activeTab === "search" && (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-indigo-50 to-white p-4 rounded-xl border border-indigo-100 mb-4">
                                        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-3">Link Crew Member</h3>
                                        <select
                                            className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            onChange={(e) => {
                                                const crewId = e.target.value;
                                                const member = crewList.find(c => c.id === crewId);
                                                if (member) handleLinkCrew(member);
                                            }}
                                            value={item.crew_member_id || ""}
                                        >
                                            <option value="">Select a crew member...</option>
                                            {crewList.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.role}) - ${c.base_rate}/hr</option>
                                            ))}
                                        </select>
                                        {item.crew_member_id && (
                                            <div className="mt-2 text-xs text-indigo-700 flex items-center gap-2">
                                                <Check size={12} /> Linked to {crewList.find(c => c.id === item.crew_member_id)?.name}
                                                <button
                                                    onClick={() => onUpdateItem({ crew_member_id: undefined, allowances: [] })}
                                                    className="text-red-400 hover:text-red-600 underline ml-auto"
                                                >
                                                    Unlink
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search roles (e.g. 'Boom Op', 'Gaffer')..."
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        {searching && <div className="text-center p-4 text-gray-400 text-sm">Searching...</div>}

                                        {!searching && results.map((res, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectRate(res)}
                                                className="w-full text-left bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="font-semibold text-gray-900">{res.classification}</div>
                                                    <div className="text-xs font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                        ${res.base_rate.toFixed(2)}/hr
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-500 flex justify-between items-center">
                                                    <span>{res.award}</span>
                                                    <span className={cn("px-1.5 py-0.5 rounded uppercase text-[10px] font-bold", res.type.toLowerCase().includes('casual') ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700")}>
                                                        {res.type}
                                                    </span>
                                                </div>
                                                {/* Badge for Score */}
                                                {res.score > 80 && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl" title="High Match" />
                                                )}
                                            </button>
                                        ))}

                                        {!searching && query && results.length === 0 && (
                                            <div className="text-center p-8 text-gray-500">
                                                <AlertCircle className="mx-auto mb-2 opacity-50" />
                                                No rates found. Try a broader term.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "calculator" && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phased Labor (Prep / Shoot / Post)</h3>

                                    <PhasedLaborCalculator
                                        initialPhases={getPhases()}
                                        initialBaseRate={item.base_hourly_rate || 0}
                                        onUpdate={(phases, total) => {
                                            onUpdateItem({
                                                labor_phases_json: JSON.stringify(phases),
                                                total: total
                                            });
                                        }}
                                    />

                                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                                        Note: Detailed Phases override the simple "Weeks x Rate" calculation.
                                    </div>
                                </div>
                            )}

                            {activeTab === "schedule" && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Weekly Shift Schedule</h3>

                                    {/* Auto-Fill Section */}
                                    <div className="bg-indigo-50 p-3 rounded border border-indigo-100 mb-4">
                                        <div className="text-xs font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                            <Calendar size={12} /> Auto-Fill from Project Calendar
                                        </div>
                                        {projectPhases.length > 0 ? (
                                            <select
                                                className="w-full text-xs border-indigo-200 rounded text-indigo-700 focus:ring-indigo-500"
                                                onChange={(e) => {
                                                    if (confirm("This will overwrite existing shifts. Continue?")) {
                                                        handleImportPhase(e.target.value);
                                                    }
                                                    e.target.value = ""; // Reset
                                                }}
                                            >
                                                <option value="">Select a Block (e.g. Main Shoot)...</option>
                                                {projectPhases.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="text-[10px] text-indigo-400 italic">No calendar blocks defined in Project Settings.</div>
                                        )}
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded border text-xs text-slate-500 mb-4">
                                        Define specific shifts (Saturday, Sunday, etc.) to trigger automatic overtime and penalty calculations based on the Award.
                                    </div>
                                    <ShiftScheduler
                                        baseRate={item.base_hourly_rate || 0}
                                        shifts={getShifts()}
                                        onChange={handleUpdateShifts}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t bg-white flex justify-end gap-2">
                            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
