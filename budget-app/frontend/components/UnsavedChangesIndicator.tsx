import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

interface Props {
    unsavedCount: number;
    isSaving: boolean;
    onSave: () => void;
    lastSavedAt?: Date;
}

export function UnsavedChangesIndicator({ unsavedCount, isSaving, onSave, lastSavedAt }: Props) {
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!isSaving && lastSavedAt) {
            // Just finished saving
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastSavedAt, isSaving]);

    const hasChanges = unsavedCount > 0;

    return (
        <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
                {isSaving ? (
                    <motion.div
                        key="saving"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-semibold"
                    >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                    </motion.div>
                ) : showSuccess ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-semibold"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved</span>
                    </motion.div>
                ) : hasChanges ? (
                    <motion.div
                        key="unsaved"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-100"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span>{unsavedCount} unsaved changes</span>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <button
                onClick={onSave}
                disabled={isSaving || !hasChanges}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-all shadow-sm ${hasChanges
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
            >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save Changes"}
            </button>

            {lastSavedAt && !hasChanges && !isSaving && !showSuccess && (
                <span className="text-[10px] text-gray-400">
                    Last saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
    );
}
