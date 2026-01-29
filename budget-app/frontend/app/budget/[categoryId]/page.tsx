"use client";

import { useEffect, useState, use } from "react";
import BudgetSheet from "@/components/BudgetSheet";
import { LaborProvider } from "@/lib/labor-context";
import { fetchProjects } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface PageProps {
    params: Promise<{
        categoryId: string;
    }>;
}

export default function CategoryPage({ params }: PageProps) {
    // Unwrapping params using React.use() as recommended in Next.js 15+
    const { categoryId } = use(params);
    const decodedId = decodeURIComponent(categoryId);

    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects().then(projects => {
            if (projects && projects.length > 0) {
                setActiveProjectId(projects[0].id);
            }
        }).catch(err => {
            console.error("Failed to fetch projects for context:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const projectId = activeProjectId || "default-project-id";

    return (
        <LaborProvider projectId={projectId}>
            <BudgetSheet categoryId={decodedId} projectId={projectId} />
        </LaborProvider>
    );
}
