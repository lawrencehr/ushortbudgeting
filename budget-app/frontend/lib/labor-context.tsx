import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ProjectPhase, fetchProjectPhases, fetchBudget, BudgetGrouping } from '@/lib/api';

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
    updateGroupingOverride: (groupingId: string, phase: keyof CalendarData, updates: Partial<PhaseConfig>) => void;

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

    // 1. Fetch Global Calendar
    useEffect(() => {
        if (!projectId) return;

        const loadCalendar = async () => {
            try {
                // In a real app we'd fetch from specific calendar endpoint.
                // For now, re-using the structure found in settings page
                // fetch(`http://localhost:8000/api/projects/${projectId}/calendar`)

                const res = await fetch(`http://localhost:8000/api/projects/${projectId}/calendar`);
                if (res.ok) {
                    const data = await res.json();
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
            } catch (err) {
                console.error("Failed to load labor context:", err);
                setError("Failed to load calendar data");
            } finally {
                setIsLoading(false);
            }
        };

        loadCalendar();
    }, [projectId]);

    // 2. Override Manager
    const updateGroupingOverride = (groupingId: string, phase: keyof CalendarData, updates: Partial<PhaseConfig>) => {
        setGroupingOverrides(prev => {
            const currentGroup = prev[groupingId] || {};
            const currentPhase = currentGroup[phase] || {};

            return {
                ...prev,
                [groupingId]: {
                    ...currentGroup,
                    [phase]: { ...currentPhase, ...updates }
                }
            };
        });
        // TODO: Persist to backend
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
