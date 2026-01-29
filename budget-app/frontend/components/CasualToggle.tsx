"use client";

import { motion } from "framer-motion";
import { Briefcase, User } from "lucide-react";

interface Props {
    isCasual: boolean;
    disabled?: boolean;
    onChange: (isCasual: boolean) => void;
}

export default function CasualToggle({ isCasual, disabled, onChange }: Props) {
    return (
        <button
            onClick={() => !disabled && onChange(!isCasual)}
            disabled={disabled}
            className={`
                relative flex items-center justify-between w-16 h-6 rounded-full px-1 py-0.5 border transition-colors shadow-sm
                ${disabled ? "opacity-50 cursor-not-allowed border-slate-100 bg-slate-50" : "cursor-pointer"}
                ${isCasual
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-slate-100 border-slate-200"
                }
            `}
            title={isCasual ? "Casual Loading Applied (25%)" : "Permanent / Flat Rate"}
        >
            {/* Perm Label (Left) */}
            <div className={`z-10 flex items-center justify-center w-6 h-full transition-opacity ${!isCasual ? "opacity-100 text-slate-500" : "opacity-40 text-indigo-300"}`}>
                <User className="w-3 h-3" />
            </div>

            {/* Casual Label (Right) */}
            <div className={`z-10 flex items-center justify-center w-6 h-full transition-opacity ${isCasual ? "opacity-100 text-indigo-600" : "opacity-40 text-slate-400"}`}>
                <Briefcase className="w-3 h-3" />
            </div>

            {/* Sliding Pill */}
            <motion.div
                initial={false}
                animate={{
                    x: isCasual ? "100%" : "0%",
                    backgroundColor: isCasual ? "#6366f1" : "white" // Indigo-500 vs White
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute left-1 top-0.5 bottom-0.5 w-6 rounded-full shadow-sm flex items-center justify-center`}
            >
                {isCasual && <span className="text-[8px] font-bold text-white tracking-tighter">CAS</span>}
            </motion.div>
        </button>
    );
}
