"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { fetchProjectSummary, ProjectSummaryResponse } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
    PieChart, Pie
} from "recharts";
import { ArrowLeft, DollarSign, Calendar, Activity, ChevronRight, FileText, TrendingUp, Layers, PieChart as PieChartIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const PHASE_COLORS: Record<string, string> = {
    "Pre-Production": "#10b981", // Emerald 500
    "Shoot": "#ef4444",          // Red 500
    "Post-Production": "#8b5cf6",// Violet 500
    "Other": "#94a3b8"           // Slate 400
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [summary, setSummary] = useState<ProjectSummaryResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjectSummary(id)
            .then(data => setSummary(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-slate-400">
                <Activity size={48} className="mb-4 opacity-50" />
                <h2 className="text-xl font-bold">Failed to load summary</h2>
            </div>
        );
    }

    const topDepartments = summary.department_breakdown.slice(0, 5);
    const otherDepartmentsCost = summary.department_breakdown.slice(5).reduce((acc, curr) => acc + curr.total, 0);

    const pieData = [
        ...topDepartments,
        ...(otherDepartmentsCost > 0 ? [{ name: 'Others', total: otherDepartmentsCost, percentage: 0 }] : [])
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-8 font-sans text-slate-900">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <header className="flex items-end justify-between border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Overview</h1>
                        <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
                            Financial summary and health check
                        </p>
                    </div>

                    <Link
                        href={`/project/${id}/budget`}
                        className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-full font-bold shadow-lg shadow-slate-200 flex items-center gap-2 transition-all transform hover:-translate-y-1"
                    >
                        View Full Budget
                        <ChevronRight size={16} />
                    </Link>
                </header>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        label="Total Estimated Cost"
                        value={`$${summary.total_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        icon={<DollarSign size={24} className="text-emerald-600" />}
                        color="emerald"
                    />
                    <MetricCard
                        label="Active Phases"
                        value={summary.phase_breakdown.length.toString()}
                        icon={<Layers size={24} className="text-blue-600" />}
                        subtext="Production Stages"
                        color="blue"
                    />
                    <MetricCard
                        label="Departments"
                        value={summary.department_breakdown.length.toString()}
                        icon={<PieChartIcon size={24} className="text-violet-600" />}
                        subtext="Cost Centers"
                        color="violet"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Top Cost Centers (Horizontal Bar) */}
                    <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-slate-800">Top Cost Centers</h3>
                            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">View All</button>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={topDepartments}
                                    margin={{ top: 0, right: 30, left: 100, bottom: 0 }} // Increased left margin for labels
                                    barSize={32}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }}
                                        width={180}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f8fafc', radius: 8 }}
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Total Cost']}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '16px' }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                                    />
                                    <Bar
                                        dataKey="total"
                                        radius={[0, 8, 8, 0]}
                                        onClick={(data) => {
                                            if (data && data.id) {
                                                router.push(`/project/${id}/budget/${data.id}`);
                                            }
                                        }}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {topDepartments.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribution Card (Donut) */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Phase Distribution</h3>
                        <p className="text-sm text-slate-500 mb-8">Breakdown of costs by production phase.</p>

                        <div className="flex-1 min-h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summary.phase_breakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={6}
                                        dataKey="total"
                                        cornerRadius={8}
                                    >
                                        {summary.phase_breakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PHASE_COLORS[entry.name] || PHASE_COLORS["Other"]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: any) => `$${Number(value).toLocaleString()}`}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center text for donut */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total</span>
                                <span className="text-xl font-black text-slate-800">
                                    ${(summary.total_cost / 1000).toFixed(0)}k
                                </span>
                            </div>
                        </div>

                        {/* Custom Legend */}
                        <div className="mt-8 space-y-3">
                            {summary.phase_breakdown.map((phase, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PHASE_COLORS[phase.name] || PHASE_COLORS["Other"] }}></span>
                                        <span className="text-slate-600 font-medium">{phase.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-800">{phase.percentage.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800">Department Breakdown</h3>
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                            <FileText size={20} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-400 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-8 py-5">Department</th>
                                    <th className="px-8 py-5">Progress</th>
                                    <th className="px-8 py-5 text-right">Amount</th>
                                    <th className="px-8 py-5 text-right">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {summary.department_breakdown.map((dept, i) => (
                                    <tr
                                        key={i}
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            if (dept.id) {
                                                router.push(`/project/${id}/budget/${dept.id}`);
                                            }
                                        }}
                                    >
                                        <td className="px-8 py-5 font-bold text-slate-700 group-hover:text-indigo-700 transition-colors underline decoration-indigo-200 underline-offset-4">{dept.name}</td>
                                        <td className="px-8 py-5 w-1/3">
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500"
                                                    style={{ width: `${dept.percentage}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                            ${dept.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-5 text-right font-medium text-slate-400">{dept.percentage.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

function MetricCard({ label, value, icon, trend, trendUp, subtext, color }: any) {
    const colorStyles = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        violet: "bg-violet-50 text-violet-600 border-violet-100",
    }[color as string] || "bg-slate-50 text-slate-600";

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${colorStyles} transition-colors`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-600'} bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100`}>
                        {trendUp ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <div className="text-4xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-indigo-900 transition-colors">{value}</div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold text-sm tracking-wide">{label}</span>
                    {subtext && <span className="text-slate-300 font-medium text-xs">• {subtext}</span>}
                </div>
            </div>
        </div>
    )
}
