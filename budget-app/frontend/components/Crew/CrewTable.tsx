"use client";

import { CrewMember } from "@/lib/api";

interface CrewTableProps {
    crew: CrewMember[];
    loading: boolean;
    onEdit: (member: CrewMember) => void;
    onDelete: (id: string) => void;
}

/**
 * CrewTable Component
 * Displays a list of crew members with their rates and allowances.
 */
export default function CrewTable({ crew, loading, onEdit, onDelete }: CrewTableProps) {
    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-12 text-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <p className="mt-4 text-gray-400 text-sm">Loading crew roster...</p>
            </div>
        );
    }

    return (
        <div className="bg-white/80 backdrop-blur-md shadow-sm border border-gray-100 rounded-xl overflow-hidden transition-all hover:shadow-md">
            <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Base Rate</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Allowances</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                    {crew.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                <p className="text-lg font-medium text-gray-900 mb-1">No crew members yet</p>
                                <p className="text-sm">Add your first crew member to get started.</p>
                            </td>
                        </tr>
                    ) : (
                        crew.map((member) => (
                            <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{member.name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium text-sm border-b border-transparent group-hover:border-indigo-100 transition-colors">
                                    <span className="bg-gray-100 text-gray-700 py-1 px-2.5 rounded-full text-xs font-medium border border-gray-200">
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-mono text-sm tracking-tight">
                                    ${member.base_rate.toFixed(2)}<span className="text-gray-400 text-xs">/hr</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                    {member.default_allowances && member.default_allowances.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {member.default_allowances.map((a, i) => (
                                                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    <span className="opacity-75">{a.name}:</span>
                                                    <span className="font-bold">${a.amount}</span>
                                                    <span className="text-[10px] uppercase opacity-60">/{a.frequency}</span>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300 text-xs italic">None</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEdit(member)}
                                            className="text-indigo-600 hover:text-indigo-900 hover:underline decoration-2 underline-offset-2 transition-all"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(member.id)}
                                            className="text-red-500 hover:text-red-700 hover:underline decoration-2 underline-offset-2 transition-all"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
