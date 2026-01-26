import { useState, useEffect } from "react";
import { Project, ProjectPhase, fetchProjectPhases, addProjectPhase, deleteProjectPhase } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Calendar, Archive, Video, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProjectSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
}

export default function ProjectSettings({ isOpen, onClose, project }: ProjectSettingsProps) {
    const [phases, setPhases] = useState<ProjectPhase[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("SHOOT"); // PREP, SHOOT, POST
    const [newStart, setNewStart] = useState("");
    const [newEnd, setNewEnd] = useState("");

    useEffect(() => {
        if (isOpen && project?.id) {
            loadPhases();
        }
    }, [isOpen, project]);

    const loadPhases = async () => {
        setLoading(true);
        try {
            const data = await fetchProjectPhases(project.id);
            // Sort by date
            data.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
            setPhases(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newName || !newStart || !newEnd) return;
        try {
            await addProjectPhase(project.id, {
                name: newName,
                type: newType,
                start_date: new Date(newStart).toISOString(),
                end_date: new Date(newEnd).toISOString()
            });
            setNewName("");
            setNewStart("");
            setNewEnd("");
            loadPhases();
        } catch (e) {
            alert("Failed to add phase");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this block?")) return;
        try {
            await deleteProjectPhase(id);
            loadPhases();
        } catch (e) {
            alert("Failed to delete phase");
        }
    };

    // Helper for icons based on type
    const getTypeIcon = (type: string) => {
        switch (type) {
            case "SHOOT": return <Video size={14} className="text-red-500" />;
            case "PREP": return <Layout size={14} className="text-blue-500" />;
            case "POST": return <Archive size={14} className="text-purple-500" />;
            default: return <Calendar size={14} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case "SHOOT": return "bg-red-50 border-red-200 text-red-700";
            case "PREP": return "bg-blue-50 border-blue-200 text-blue-700";
            case "POST": return "bg-purple-50 border-purple-200 text-purple-700";
            default: return "bg-gray-50 border-gray-200 text-gray-700";
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Project Calendar</h2>
                            <p className="text-sm text-gray-500">Define global Prep, Shoot, and Post blocks.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Plus className="rotate-45" size={20} /></button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-6">

                        {/* List Existing */}
                        <div className="space-y-3">
                            {phases.length === 0 && !loading && (
                                <div className="text-center p-8 text-gray-400 border-2 border-dashed rounded-xl">
                                    No calendar blocks defined yet. Add one below!
                                </div>
                            )}

                            {phases.map(phase => {
                                const start = format(parseISO(phase.start_date), "MMM d, yyyy");
                                const end = format(parseISO(phase.end_date), "MMM d, yyyy");
                                return (
                                    <div key={phase.id} className={`flex items-center justify-between p-3 rounded-lg border ${getTypeColor(phase.type)}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full shadow-sm">
                                                {getTypeIcon(phase.type)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm tracking-tight">{phase.name}</div>
                                                <div className="text-xs opacity-80 font-mono">{start} → {end}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold px-2 py-1 bg-white/50 rounded">{phase.type}</span>
                                            <button onClick={() => handleDelete(phase.id)} className="p-2 hover:bg-white/80 rounded-full text-red-500/70 hover:text-red-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 border-t bg-gray-50">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Add New Block</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input
                                className="col-span-2 border-gray-200 rounded-lg text-sm"
                                placeholder="Block Name (e.g. Main Shoot)"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                            <select
                                className="border-gray-200 rounded-lg text-sm"
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                            >
                                <option value="PREP">Prep Block</option>
                                <option value="SHOOT">Shoot Block</option>
                                <option value="POST">Post Block</option>
                            </select>
                            <div className="col-span-2 grid grid-cols-2 gap-3">
                                <label className="text-xs text-gray-500">
                                    Start Date
                                    <input type="date" className="w-full mt-1 border-gray-200 rounded-lg text-sm" value={newStart} onChange={e => setNewStart(e.target.value)} />
                                </label>
                                <label className="text-xs text-gray-500">
                                    End Date
                                    <input type="date" className="w-full mt-1 border-gray-200 rounded-lg text-sm" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newName || !newStart || !newEnd}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            Add Calendar Block
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
