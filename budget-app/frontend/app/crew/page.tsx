"use client";

import { useState, useEffect } from "react";
import {
    fetchCrew,
    addCrewMember,
    updateCrewMember,
    deleteCrewMember,
    CrewMember,
    LaborAllowance
} from "@/lib/api";
import Link from "next/link";
import CrewTable from "@/components/Crew/CrewTable";

export default function CrewPage() {
    const [crew, setCrew] = useState<CrewMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [baseRate, setBaseRate] = useState(0);
    const [allowances, setAllowances] = useState<LaborAllowance[]>([]);

    useEffect(() => {
        loadCrew();
    }, []);

    const loadCrew = async () => {
        try {
            setLoading(true);
            const data = await fetchCrew();
            setCrew(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (member?: CrewMember) => {
        if (member) {
            setEditingId(member.id);
            setName(member.name);
            setRole(member.role);
            setBaseRate(member.base_rate);
            setAllowances(member.default_allowances || []);
        } else {
            setEditingId(null);
            setName("");
            setRole("");
            setBaseRate(0);
            setAllowances([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSave = async () => {
        const memberData = {
            name,
            role,
            base_rate: baseRate,
            default_allowances: allowances
        };

        try {
            if (editingId) {
                // Update
                await updateCrewMember(editingId, { ...memberData, id: editingId });
            } else {
                // Create
                await addCrewMember(memberData);
            }
            loadCrew();
            handleCloseModal();
        } catch (err) {
            alert("Failed to save crew member");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this crew member?")) return;
        try {
            await deleteCrewMember(id);
            loadCrew();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    // Allowance Helpers
    const addAllowance = () => {
        setAllowances([...allowances, { name: "", amount: 0, frequency: "day" }]);
    };

    const updateAllowance = (index: number, field: keyof LaborAllowance, value: any) => {
        const newAllowances = [...allowances];
        newAllowances[index] = { ...newAllowances[index], [field]: value };
        setAllowances(newAllowances);
    };

    const removeAllowance = (index: number) => {
        const newAllowances = allowances.filter((_, i) => i !== index);
        setAllowances(newAllowances);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="flex justify-between items-end border-b border-gray-200/60 pb-6">
                    <div>
                        <Link
                            href="/budget"
                            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-3 transition-colors group"
                        >
                            <svg className="w-4 h-4 mr-1 transform transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Budget
                        </Link>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                            Crew Management
                        </h1>
                        <p className="mt-2 text-lg text-gray-500 max-w-2xl">
                            Configure your standard crew roster, default rates, and automated allowances.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all hover:scale-105 active:scale-95"
                    >
                        <svg className="w-5 h-5 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Crew Member
                    </button>
                </header>

                <main>
                    <CrewTable
                        crew={crew}
                        loading={loading}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
                    />
                </main>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all scale-100">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {editingId ? "Edit Crew Member" : "New Crew Member"}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-gray-900 placeholder-gray-400 border transition-all"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700">Role Title</label>
                                    <input
                                        type="text"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-gray-900 placeholder-gray-400 border transition-all"
                                        placeholder="e.g. Key Grip"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Base Hourly Rate</label>
                                <div className="relative rounded-md shadow-sm max-w-xs">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={baseRate}
                                        onChange={(e) => setBaseRate(parseFloat(e.target.value) || 0)}
                                        className="block w-full rounded-lg border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-gray-900 border transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50/80 rounded-xl p-6 border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Standard Allowances</h4>
                                        <p className="text-xs text-gray-500 mt-1">Automatically applied to daily calculations</p>
                                    </div>
                                    <button
                                        onClick={addAllowance}
                                        className="inline-flex items-center px-3 py-1.5 border border-indigo-200 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {allowances.length === 0 && (
                                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                            <p className="text-sm text-gray-400">No allowances configured.</p>
                                        </div>
                                    )}
                                    {allowances.map((allowance, index) => (
                                        <div key={index} className="flex gap-4 items-start bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                            <div className="flex-grow space-y-1">
                                                <label className="block text-[10px] uppercase font-bold text-gray-400">Description</label>
                                                <input
                                                    type="text"
                                                    value={allowance.name}
                                                    onChange={(e) => updateAllowance(index, "name", e.target.value)}
                                                    className="block w-full border-gray-200 rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all"
                                                    placeholder="Meal Money"
                                                />
                                            </div>
                                            <div className="w-32 space-y-1">
                                                <label className="block text-[10px] uppercase font-bold text-gray-400">Amount ($)</label>
                                                <input
                                                    type="number"
                                                    value={allowance.amount}
                                                    onChange={(e) => updateAllowance(index, "amount", parseFloat(e.target.value) || 0)}
                                                    className="block w-full border-gray-200 rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all"
                                                />
                                            </div>
                                            <div className="w-36 space-y-1">
                                                <label className="block text-[10px] uppercase font-bold text-gray-400">Frequency</label>
                                                <select
                                                    value={allowance.frequency}
                                                    onChange={(e) => updateAllowance(index, "frequency", e.target.value)}
                                                    className="block w-full border-gray-200 rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all"
                                                >
                                                    <option value="day">Per Day</option>
                                                    <option value="week">Per Week</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => removeAllowance(index)}
                                                className="mt-6 text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white hover:border-gray-400 focus:ring-4 focus:ring-gray-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg focus:ring-4 focus:ring-indigo-200 transition-all transform active:scale-95"
                            >
                                {editingId ? "Save Changes" : "Create Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
