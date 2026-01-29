"use client";

import React from "react";

export default function BudgetHeader() {
    return (
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider items-center rounded-t-lg">
            <div className="col-span-4 pl-1">Description</div>
            <div className="col-span-2 text-right pr-2">Rate Breakdown</div>
            <div className="col-span-1 text-center">Type</div>
            <div className="col-span-3 flex items-center justify-center pr-2">
                <span className="text-slate-300 font-medium">Phase Toggles</span>
            </div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
        </div>
    );
}
