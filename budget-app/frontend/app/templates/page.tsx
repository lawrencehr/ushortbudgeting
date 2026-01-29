"use client";

import { TemplateManager } from "@/components/TemplateManager";

export default function TemplatesPage() {
    return (
        <div className="h-full flex flex-col bg-white">
            <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white shadow-sm z-10">
                <h1 className="text-xl font-bold text-gray-900">Budget Templates</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Manage your budget templates for quick project setup.
                </p>
            </header>

            <main className="flex-1 overflow-auto p-6 bg-slate-50/50">
                <div className="max-w-6xl mx-auto">
                    {/* We assume there's a current budget ID available globally or via context 
              if we want to enable "Save Current as Template". 
              For now, we'll pass undefined or handle it via a context later. 
              Ideally, this page is for managing existing templates. 
              Creating a template from the current budget might be better placed in the Budget view.
              But let's leave currentBudgetId empty here so it's just a manager.
          */}
                    <TemplateManager
                        mode="manage"
                    // currentBudgetId={...} // To be implemented if we want creation from here, but creation usually needs a source.
                    />
                </div>
            </main>
        </div>
    );
}
