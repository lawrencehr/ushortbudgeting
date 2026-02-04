"use client";

import { use } from "react";
import BudgetSheet from "@/components/BudgetSheet";
import { LaborProvider } from "@/lib/labor-context";

interface PageProps {
    params: Promise<{
        id: string; // Project ID
    }>;
}

export default function ProjectBudgetPage({ params }: PageProps) {
    const { id } = use(params);
    const projectId = decodeURIComponent(id);

    return (
        <LaborProvider projectId={projectId}>
            <div className="container mx-auto p-4 max-w-7xl">
                <BudgetSheet projectId={projectId} />
            </div>
        </LaborProvider>
    );
}
