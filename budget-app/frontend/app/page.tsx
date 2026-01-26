"use client";

import { useEffect, useState } from "react";
import { fetchSummary, fetchBudget, BudgetSummary, BudgetCategory } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ChevronRight, LayoutGrid, BarChart3, Receipt } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchBudget()])
      .then(([summaryData, catData]) => {
        setSummary(summaryData);
        setCategories(catData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Intelligence...</div>;
  if (!summary) return <div className="p-4 text-center text-red-500 bg-red-50 rounded-lg">Error loading financial data.</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8">
      <header className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Main Budget Summary</h2>
          <p className="text-slate-500 mt-2 font-medium">Overview of all active accounts and departmental drill-downs.</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 mb-2 inline-block">Live Projection</span>
          <div className="text-4xl font-black text-emerald-600 font-mono tracking-tighter">
            ${summary.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </header>

      {/* High Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Above The Line (ATL)"
          amount={summary.atl_total}
          icon={<LayoutGrid size={20} />}
          subtitle="Developer, Producers, Cast"
          color="indigo"
        />
        <SummaryCard
          title="Below The Line (BTL)"
          amount={summary.btl_total}
          icon={<BarChart3 size={20} />}
          subtitle="Crew, Equipment, Post"
          color="slate"
        />
        <SummaryCard
          title="Fringes & Contingency"
          amount={summary.fringes_total + summary.contingency_total}
          icon={<Receipt size={20} />}
          subtitle="Taxes, Super, 10% Accrual"
          color="amber"
        />
      </div>

      {/* Detailed Account Ledger */}
      <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" /> Account Ledger (1-14)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">ID</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Name</th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest w-40">Total Amount</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {(categories || []).map((cat) => (
                <tr
                  key={cat.id}
                  onClick={() => router.push(`/budget/${cat.id}`)}
                  className="group hover:bg-indigo-50/30 transition-all cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-indigo-600">
                    {cat.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-slate-900">
                    ${cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fringe Breakdown */}
      <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <Receipt size={18} className="text-amber-600" /> Fringe Allocations
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(summary.fringe_breakdown || {}).map(([key, value]) => (
            <div key={key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">{key.replace(/_/g, " ")}</div>
              <div className="text-sm font-bold text-slate-700">${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ title, amount, subtitle, icon, color }: { title: string, amount: number, subtitle: string, icon: any, color: "indigo" | "slate" | "amber" }) {
  const colorClasses = {
    indigo: "border-indigo-100 bg-indigo-50/50 text-indigo-700 icon:text-indigo-600",
    slate: "border-slate-200 bg-slate-50 text-slate-700 icon:text-slate-600",
    amber: "border-amber-100 bg-amber-50/50 text-amber-700 icon:text-amber-600",
  };

  return (
    <div className={`p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${colorClasses[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Metric View</div>
      </div>
      <h3 className="text-sm font-bold opacity-80">{title}</h3>
      <p className="text-2xl font-black mt-1 font-mono tracking-tight">
        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <p className="text-[10px] mt-2 opacity-60 font-medium italic">{subtitle}</p>
    </div>
  );
}
