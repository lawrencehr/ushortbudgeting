"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Project, fetchProjects, fetchBudget, BudgetCategory } from "@/lib/api";
import ProjectSettings from "@/components/ProjectSettings";
import { Calendar as CalendarIcon } from "lucide-react";

export default function AppSidebar() {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        fetchBudget()
            .then(data => setCategories(data || []))
            .catch(err => {
                console.error('Failed to fetch budget:', err);
                setCategories([]);
            });
        fetchProjects()
            .then(projects => {
                if (projects.length > 0) setProject(projects[0]);
            })
            .catch(console.error);
    }, []);

    return (
        <>
            <aside className="w-64 bg-slate-100 border-r border-gray-200 flex-shrink-0 overflow-y-auto h-screen sticky top-0 flex flex-col justify-between">
                <div className="p-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Departments</h2>
                    <nav className="space-y-1">
                        <Link
                            href="/budget"
                            className={`block px-3 py-2 text-sm font-medium rounded-md ${pathname === "/budget"
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            All Departments
                        </Link>

                        <div className="pt-2" />

                        {categories.map((cat) => {
                            const isActive = pathname === `/budget/${cat.id}`;
                            return (
                                <Link
                                    key={cat.id}
                                    href={`/budget/${cat.id}`}
                                    className={`block px-3 py-2 text-sm font-medium rounded-md truncate ${isActive
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-gray-700 hover:bg-gray-200"
                                        }`}
                                    title={cat.name}
                                >
                                    <span className="font-bold mr-2">{cat.code}</span>
                                    {cat.name.replace(/^\d+\.\s*/, "")}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-gray-200 bg-slate-200/50">
                    <Link
                        href="/settings/calendar"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm rounded transition-all"
                    >
                        <CalendarIcon size={16} className="text-indigo-600" />
                        <span>Project Calendar</span>
                    </Link>
                </div>
            </aside>

            {project && (
                <ProjectSettings
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    project={project}
                />
            )}
        </>
    );
}
