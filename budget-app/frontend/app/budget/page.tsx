"use client";

import { useEffect, useState } from "react";
import BudgetSheet from "@/components/BudgetSheet";
import { LaborProvider } from "@/lib/labor-context";
import { fetchProjects } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function BudgetPage() {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd get this from URL or user selection
    // Here we fetch the first available project to bind the context
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

  // Fallback to a placeholder if no project found, though LaborProvider might fail to fetch calendar
  const projectId = activeProjectId || "default-project-id";

  return (
    <LaborProvider projectId={projectId}>
      <div className="container mx-auto p-4 max-w-7xl">
        <BudgetSheet projectId={projectId} />
      </div>
    </LaborProvider>
  );
}
