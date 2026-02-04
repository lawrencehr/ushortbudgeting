import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useLaborContext, CalendarData } from '@/lib/labor-context';
import { PhaseOverridePopover } from './PhaseOverridePopover';

interface Props {
    groupingId: string;
    groupingName: string;
}

export function DepartmentSettingsPopover({ groupingId, groupingName }: Props) {
    const { groupingOverrides, updateGroupingOverride, projectCalendar } = useLaborContext();
    const [isOpen, setIsOpen] = useState(false);

    // Initial data: combine global defaults with any existing overrides
    const initialData: CalendarData = React.useMemo(() => {
        const overrides = groupingOverrides[groupingId] || {};
        return {
            preProd: {
                defaultHours: overrides.preProd?.defaultHours ?? projectCalendar.preProd.defaultHours,
                dates: overrides.preProd?.dates ?? projectCalendar.preProd.dates,
                inherit: overrides.preProd?.inherit ?? true
            },
            shoot: {
                defaultHours: overrides.shoot?.defaultHours ?? projectCalendar.shoot.defaultHours,
                dates: overrides.shoot?.dates ?? projectCalendar.shoot.dates,
                inherit: overrides.shoot?.inherit ?? true
            },
            postProd: {
                defaultHours: overrides.postProd?.defaultHours ?? projectCalendar.postProd.defaultHours,
                dates: overrides.postProd?.dates ?? projectCalendar.postProd.dates,
                inherit: overrides.postProd?.inherit ?? true
            }
        };
    }, [groupingId, groupingOverrides, projectCalendar]);

    const handleSave = (updatedData: CalendarData) => {
        // Update context with full object to avoid race conditions
        updateGroupingOverride(groupingId, updatedData);
        setIsOpen(false);
    };

    // Check if any overrides exist
    const hasOverride = React.useMemo(() => {
        const overrides = groupingOverrides[groupingId];
        if (!overrides) return false;
        // If any phase is explicitly NOT inheriting, we count it as an override
        return (overrides.preProd?.inherit === false) ||
            (overrides.shoot?.inherit === false) ||
            (overrides.postProd?.inherit === false);
    }, [groupingOverrides, groupingId]);

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1 rounded transition-colors ${isOpen || hasOverride ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                title={`${groupingName} Settings`}
            >
                <Calendar className="w-4 h-4" />
            </button>

            {isOpen && (
                <PhaseOverridePopover
                    title={`${groupingName} Overrides`}
                    initialData={initialData}
                    defaultData={projectCalendar}
                    onSave={handleSave}
                    onClose={() => setIsOpen(false)}
                    className="left-0 top-full mt-2"
                />
            )}
        </div>
    );
}

