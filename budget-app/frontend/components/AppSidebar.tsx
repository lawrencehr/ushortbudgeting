"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Project, fetchBudget, BudgetCategory } from "@/lib/api";
import ProjectSettings from "@/components/ProjectSettings";
import { BudgetWizard } from "@/components/BudgetWizard";
import { Calendar as CalendarIcon, Home, ArrowLeft } from "lucide-react";

export default function AppSidebar() {
    const [categories, setCategories] = useState<BudgetCategory[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const pathname = usePathname();

    // Extract project ID from path
    const pathParts = pathname.split('/');
    const projectId = pathParts[1] === 'project' ? pathParts[2] : null;

    useEffect(() => {
        fetchBudget(projectId || undefined)
            .then(data => setCategories(data || []))
            .catch(err => {
                console.error('Failed to fetch budget:', err);
                setCategories([]);
            });
    }, [pathname, projectId]);

    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Refresh handler for when a new budget is created
    const handleBudgetCreated = (id: string) => {
        setIsWizardOpen(false);
        window.location.href = `/budget/${id}`;
    };

    const homeLink = projectId ? `/project/${projectId}` : "/";
    const homeText = projectId ? "Project Home" : "All Projects";

    return (
        <>
            <aside className="w-64 bg-slate-100 border-r border-gray-200 flex-shrink-0 h-full flex flex-col">
                <div className="p-4 flex-1 overflow-y-auto">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Navigation</h2>
                    <nav className="space-y-1">
                        <Link
                            href={homeLink}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mb-6 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors`}
                        >
                            {projectId ? <Home size={16} /> : <ArrowLeft size={16} />}
                            <span className="font-bold">{homeText}</span>
                        </Link>

                        {categories.length > 0 && (
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Departments</h2>
                        )}

                        {categories.map((cat) => {
                            const href = projectId
                                ? `/project/${projectId}/budget/${cat.id}`
                                : `/budget/${cat.id}`;

                            const isActive = pathname.includes(`/budget/${cat.id}`);

                            return (
                                <Link
                                    key={cat.id}
                                    href={href}
                                    className={`block px-3 py-2 text-sm font-medium rounded-md truncate ${isActive
                                        ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                                        }`}
                                    title={cat.name}
                                >
                                    <span className="font-bold mr-2 text-xs opacity-70">{cat.code}</span>
                                    {cat.name.replace(/^\d+\.\s*/, "")}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Actions - Fixed to bottom */}
                <div className="p-4 border-t border-gray-200 bg-white/50 backdrop-blur-sm z-10 flex-shrink-0">
                    <Link
                        href="/settings/calendar"
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm font-medium rounded transition-all ${pathname === '/settings/calendar'
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "text-slate-700 hover:bg-white hover:shadow-sm"
                            }`}
                    >
                        <CalendarIcon size={16} className={pathname === '/settings/calendar' ? "text-white" : "text-indigo-600"} />
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

            {isWizardOpen && (
                <BudgetWizard
                    onClose={() => setIsWizardOpen(false)}
                    onBudgetCreated={handleBudgetCreated}
                />
            )}
        </>
    );
}
