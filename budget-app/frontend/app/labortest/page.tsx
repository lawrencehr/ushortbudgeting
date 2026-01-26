"use client";

import LaborCalculator from "@/components/LaborCalculator/LaborCalculator";

export default function LaborTestPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 gap-8">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Labor Calculator Test Lab</h1>
                <p className="text-gray-500">Isolating component for verification</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-600">Instance 1: Default (Simple)</h2>
                    <LaborCalculator />
                </div>

                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-600">Instance 2: Pre-filled (Detailed)</h2>
                    <LaborCalculator
                        initialMode="detailed"
                        initialBaseRate={65.50}
                        initialHours={12}
                        initialDays={6}
                    />
                </div>
            </div>
        </div>
    );
}
