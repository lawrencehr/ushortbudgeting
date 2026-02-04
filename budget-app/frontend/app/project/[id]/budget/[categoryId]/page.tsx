"use client";

import { use } from "react";
import BudgetSheet from "@/components/BudgetSheet";
import { LaborProvider } from "@/lib/labor-context";

interface PageProps {
    params: Promise<{
        id: string;      // Project ID
        categoryId: string; // Category ID
    }>;
}

export default function ProjectBudgetCategoryPage({ params }: PageProps) {
    const { id, categoryId } = use(params);
    const projectId = decodeURIComponent(id);
    const catId = decodeURIComponent(categoryId);

    return (
        <LaborProvider projectId={projectId}>
            <BudgetSheet projectId={projectId} categoryId={catId} />
        </LaborProvider>
    );
}
