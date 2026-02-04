"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchProjects, createProject, Project, fetchTemplates, BudgetTemplate } from "@/lib/api";
import { Plus, FolderOpen, Calendar, User, Search, FileText } from "lucide-react";
import Link from "next/link";
import { TemplateManager } from "@/components/TemplateManager";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Template State
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Create Modal State
  const [newProjectName, setNewProjectName] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
    loadTemplates(); // Pre-load templates for the modal
  }, []);

  const loadProjects = () => {
    setLoading(true);
    fetchProjects()
      .then(data => setProjects(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadTemplates = () => {
    fetchTemplates()
      .then(data => setTemplates(data))
      .catch(err => console.error("Failed to load templates", err));
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    setCreating(true);
    try {
      await createProject({
        name: newProjectName,
        client: newClientName,
        template_id: selectedTemplateId || undefined
      });
      setIsCreateModalOpen(false);
      setNewProjectName("");
      setNewClientName("");
      setSelectedTemplateId("");
      loadProjects(); // Reload list
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.client || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
            <p className="text-slate-500 font-medium mt-2">Manage your budget versions and productions.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsTemplateManagerOpen(true)}
              className="bg-white text-slate-600 hover:text-indigo-600 px-4 py-3 rounded-lg font-bold shadow-sm border border-slate-200 flex items-center gap-2 transition-all hover:border-indigo-200"
            >
              <FileText size={18} /> Manage Templates
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all transform hover:-translate-y-1"
            >
              <Plus size={20} /> New Project
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search projects by name or client..."
            className="flex-1 outline-none text-slate-700 font-medium placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <Link
                key={project.id}
                href={`/project/${project.id}/budget`}
                className="block"
              >
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FolderOpen size={64} className="text-indigo-600" />
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{project.name}</h3>
                    {project.client && (
                      <div className="flex items-center gap-1 text-slate-500 text-sm mt-1 font-medium">
                        <User size={14} /> {project.client}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider mt-8 pt-4 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : "No Date"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && !loading && (
          <div className="text-center py-20 opacity-50">
            <FolderOpen size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-400">No projects found.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder="e.g. TVC Campaign 2024"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Client (Optional)</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Start from Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                >
                  <option value="">(None) Empty Project</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName || creating}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {isTemplateManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">Manage Templates</h2>
              <button onClick={() => setIsTemplateManagerOpen(false)} className="text-slate-400 hover:text-slate-600">
                Close
              </button>
            </div>
            <div className="p-6">
              <TemplateManager
                currentBudgetId="dashboard-mode"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
