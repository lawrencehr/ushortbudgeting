import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Award } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: any) => void;
}

export default function AwardRateSearchModal({ isOpen, onClose, onSelect }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Debounced Search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                // Determine API URL (assuming relative path works in Next.js proxy, else absolute)
                // In this env, likely /api via proxy or direct.
                const res = await fetch(`http://localhost:8000/api/rates/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-4 border-b border-indigo-50 flex items-center gap-2 bg-indigo-50/50">
                    <Search className="w-5 h-5 text-indigo-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder-slate-400 text-slate-800"
                        placeholder="Search Award Rates (e.g. Director, Camera)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                    {loading && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2 bg-slate-50 min-h-[300px]">
                    {results.length === 0 && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Award className="w-8 h-8 opacity-20" />
                            <span className="text-sm">Type to search for award rates</span>
                        </div>
                    )}

                    {results.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => onSelect(item)}
                            className="w-full text-left p-3 hover:bg-white hover:shadow-sm hover:border-indigo-200 border border-transparent rounded-lg transition-all mb-1 group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-slate-700 group-hover:text-indigo-700">
                                        {item.classification}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">
                                        {item.section_name}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-slate-800 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                                        ${item.hourly_rate?.toFixed(2)}
                                        <span className="text-[10px] ml-0.5 opacity-70">/hr</span>
                                    </div>
                                    {item._meta_source && (
                                        <div className="text-[9px] text-slate-300 mt-1">
                                            {item._meta_source}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-2 bg-white border-t border-slate-100 text-[10px] text-center text-slate-400">
                    Sourced from Live Payguide Database
                </div>
            </div>
        </div>
    );
}
