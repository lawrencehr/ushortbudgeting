import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ProjectPhase, fetchProjectPhases, fetchBudget, BudgetGrouping, updateBudgetGrouping } from '@/lib/api';

// --- Types ---

export interface PhaseConfig {
    defaultHours: number;
    dates: string[]; // ISO Dates
    inherit?: boolean; // For overrides
}

export interface CalendarData {
    preProd: PhaseConfig;
    shoot: PhaseConfig;
    postProd: PhaseConfig;
}

export interface GroupingOverride {
    groupingId: string;
    overrides: Partial<CalendarData>;
}

interface LaborContextType {
    // Global Calendar
    projectCalendar: CalendarData;
    isLoading: boolean;
    error: string | null;

    // Grouping Overrides
    groupingOverrides: Record<string, Partial<CalendarData>>;
    updateGroupingOverride: (groupingId: string, updates: Partial<CalendarData>) => void;

    // Helper: Get effective configuration for a specific grouping & phase
    getEffectivePhaseConfig: (groupingId: string | undefined, phase: keyof CalendarData) => PhaseConfig;
}

// --- Defaults ---

const DEFAULT_PHASE_CONFIG: PhaseConfig = { defaultHours: 8, dates: [] };

const DEFAULT_CALENDAR: CalendarData = {
    preProd: { ...DEFAULT_PHASE_CONFIG, defaultHours: 8 },
    shoot: { ...DEFAULT_PHASE_CONFIG, defaultHours: 10 }, // Shoot usually 10h
    postProd: { ...DEFAULT_PHASE_CONFIG, defaultHours: 8 },
};

const LaborContext = createContext<LaborContextType | undefined>(undefined);

// --- Provider ---

export function LaborProvider({ children, projectId }: { children: ReactNode, projectId: string }) {
    const [projectCalendar, setProjectCalendar] = useState<CalendarData>(DEFAULT_CALENDAR);
    const [groupingOverrides, setGroupingOverrides] = useState<Record<string, Partial<CalendarData>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Global Calendar & Overrides
    useEffect(() => {
        if (!projectId) return;

        const loadData = async () => {
            try {
                // A. Fetch Global Calendar
                const calRes = await fetch(`http://localhost:8000/api/projects/${projectId}/calendar`);
                if (calRes.ok) {
                    const data = await calRes.json();
                    // Map Backend Response to Context State
                    setProjectCalendar({
                        preProd: {
                            defaultHours: data.phases?.preProd?.defaultHours || 8,
                            dates: data.phases?.preProd?.dates || []
                        },
                        shoot: {
                            defaultHours: data.phases?.shoot?.defaultHours || 10,
                            dates: data.phases?.shoot?.dates || []
                        },
                        postProd: {
                            defaultHours: data.phases?.postProd?.defaultHours || 8,
                            dates: data.phases?.postProd?.dates || []
                        }
                    });
                }

                // B. Fetch Budget to Extract Overrides
                const budgetCats = await fetchBudget();
                const overridesMap: Record<string, Partial<CalendarData>> = {};

                budgetCats.forEach(cat => {
                    cat.groupings.forEach(grp => {
                        if (grp.calendar_overrides && Object.keys(grp.calendar_overrides).length > 0) {
                            overridesMap[grp.id] = grp.calendar_overrides;
                        }
                    });
                });
                setGroupingOverrides(overridesMap);

            } catch (err) {
                console.error("Failed to load labor context:", err);
                setError("Failed to load calendar data");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    // 2. Override Manager
    const updateGroupingOverride = async (groupingId: string, updates: Partial<CalendarData>) => {
        let newGroupOverrides: Partial<CalendarData> = {};

        setGroupingOverrides(prev => {
            const currentGroup = prev[groupingId] || {};

            // Merge existing overrides with new updates
            const updatedGroup = {
                ...currentGroup,
                ...updates
            };

            newGroupOverrides = updatedGroup;

            return {
                ...prev,
                [groupingId]: updatedGroup
            };
        });

        // Persist to backend
        // Note: newGroupOverrides calculated above captures the *intent* of the new state,
        // even if 'prev' in setGroupingOverrides might be slightly different in race conditions,
        // effectively we are saving the 'merged' result of what we know + what we just changed.
        // Ideally we should use the functional update pattern truly, but for persistence we need the value.
        // Given we are replacing the *whole* override object for this grouping in the DB patch,
        // we should try to construct the 'complete' merged object.

        // Better approach for Async Persistence:
        // Use the current 'groupingOverrides' from closure (which might be stale if called rapidly)
        // BUT since we are now doing a SINGLE call from the UI, we avoid the 3-call race.
        // So 'groupingOverrides' + 'updates' is roughly accurate.

        // Use functional set param to ensure React state is correct.
        // But for DB, we use the merged result. 

        // Actually, 'newGroupOverrides' captured inside the render phase or effect is risky.
        // But here we are inside the event handler triggered by UI. 
        // We will trust 'groupingOverrides' (current state) + 'updates'.

        const mergedOverrides = {
            ...(groupingOverrides[groupingId] || {}),
            ...updates
        };

        try {
            await updateBudgetGrouping(groupingId, { calendar_overrides: mergedOverrides });
        } catch (e) {
            console.error("Failed to save grouping override:", e);
        }
    };

    // 3. Resolution Logic (The Cascade)
    const getEffectivePhaseConfig = (groupingId: string | undefined, phase: keyof CalendarData): PhaseConfig => {
        const globalConfig = projectCalendar[phase];

        if (!groupingId) return globalConfig;

        const override = groupingOverrides[groupingId]?.[phase];

        // If no override or inherit is true, use global
        if (!override || override.inherit) {
            return globalConfig;
        }

        // Return mixed config (using overrides where present, falling back to global otherwise)
        return {
            defaultHours: override.defaultHours ?? globalConfig.defaultHours,
            dates: override.dates ?? globalConfig.dates, // Full replacement of list for now
            inherit: false
        };
    };

    return (
        <LaborContext.Provider value={{
            projectCalendar,
            isLoading,
            error,
            groupingOverrides,
            updateGroupingOverride,
            getEffectivePhaseConfig
        }}>
            {children}
        </LaborContext.Provider>
    );
}

// --- Hook ---

export function useLaborContext() {
    const context = useContext(LaborContext);
    if (!context) {
        throw new Error("useLaborContext must be used within a LaborProvider");
    }
    return context;
}

export function useLaborContextSafe() {
    return useContext(LaborContext);
}
