"use client";

import { use } from "react";
import BudgetSheet from "@/components/BudgetSheet";

interface PageProps {
    params: Promise<{
        categoryId: string;
    }>;
}

export default function CategoryPage({ params }: PageProps) {
    // Unwrapping params using React.use() as recommended in Next.js 15+
    const { categoryId } = use(params);

    // Decode URI component just in case
    const decodedId = decodeURIComponent(categoryId);

    return (
        <BudgetSheet categoryId={decodedId} />
    );
}
