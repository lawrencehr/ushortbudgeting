"use client";

import { useEffect, useState } from "react";
import { fetchProjects, Project } from "@/lib/api";

export default function ProjectHeader() {
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects()
            .then((data) => {
                if (data && data.length > 0) {
                    setProject(data[0]);
                }
            })
            .catch((err) => console.error("Failed to load project info", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-16 bg-white border-b border-indigo-100 animate-pulse"></div>;
    if (!project) return null;

    return (
        <div className="bg-white/80 backdrop-blur-md border-b border-indigo-100 px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm transition-all">
            <div className="flex flex-col">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">{project.name}</h1>
                    {project.client && (
                        <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {project.client}
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex gap-2 uppercase tracking-wide mt-0.5">
                    <span>Prod #: {project.id.split('-')[0]}</span>
                    {project.start_date && (
                        <>
                            <span>•</span>
                            <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Budget Status</div>
                    <div className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                    </div>
                </div>
            </div>
        </div>
    );
}
