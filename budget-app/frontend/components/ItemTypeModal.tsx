import React, { useEffect, useRef } from 'react';
import { Briefcase, Package, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'labor' | 'material') => void;
}

export default function ItemTypeModal({ isOpen, onClose, onSelect }: Props) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Focus trap could be added here
        }

        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
                ref={modalRef}
                className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 id="modal-title" className="mb-6 text-center text-xl font-semibold text-gray-900">
                    What type of item?
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onSelect('labor')}
                        className="group flex flex-col items-center justify-center rounded-lg border-2 border-slate-100 p-6 transition-all hover:border-indigo-100 hover:bg-indigo-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <div className="mb-3 rounded-full bg-indigo-100 p-3 text-indigo-600 group-hover:bg-indigo-200">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-gray-900">Labor</span>
                        <span className="mt-1 text-xs text-gray-500">Crew roles, talent fees</span>
                    </button>

                    <button
                        onClick={() => onSelect('material')}
                        className="group flex flex-col items-center justify-center rounded-lg border-2 border-slate-100 p-6 transition-all hover:border-indigo-100 hover:bg-indigo-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <div className="mb-3 rounded-full bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-200">
                            <Package className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-gray-900">Material</span>
                        <span className="mt-1 text-xs text-gray-500">Equipment, rentals, etc</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
