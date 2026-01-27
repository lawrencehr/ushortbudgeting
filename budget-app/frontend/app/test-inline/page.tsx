'use client';
import React, { useState } from 'react';
import ItemTypeModal from '@/components/ItemTypeModal';
import InlineItemEditor, { InlineItemData } from '@/components/InlineItemEditor';

export default function TestInlinePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editorState, setEditorState] = useState<{
        active: boolean;
        type: 'labor' | 'material';
    }>({ active: false, type: 'labor' });

    const [savedItems, setSavedItems] = useState<InlineItemData[]>([]);

    const handleSelectType = (type: 'labor' | 'material') => {
        setIsModalOpen(false);
        setEditorState({ active: true, type });
    };

    const handleSave = (data: InlineItemData) => {
        setSavedItems([...savedItems, data]);
        setEditorState({ ...editorState, active: false });
    };

    return (
        <div className="p-10 max-w-4xl mx-auto bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-8">Inline Editor Component Test</h1>

            {/* 1. Modal Test */}
            <div className="mb-8 p-4 bg-white rounded shadow text-center">
                <h2 className="text-lg font-semibold mb-4">1. Test Item Type Modal</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                    Open Modal
                </button>
                <ItemTypeModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={handleSelectType}
                />
                {editorState.active && (
                    <div className="mt-2 text-green-600">
                        Selected: {editorState.type.toUpperCase()} - Editor Active
                    </div>
                )}
            </div>

            {/* 2. Editor Test */}
            <div className="mb-8 p-4 bg-white rounded shadow">
                <h2 className="text-lg font-semibold mb-4">2. Test Inline Editor</h2>

                {/* Headers */}
                <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 mb-2 px-2">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-3 text-center">Prep / Shoot / Post</div>
                    <div className="col-span-2 text-right">Total</div>
                    <div className="col-span-1"></div>
                </div>

                {/* List of Saved Items */}
                {savedItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 p-2 border-b items-center text-sm">
                        <div className="col-span-4 font-medium">{item.description}</div>
                        <div className="col-span-2">${item.rate}/{item.unit}</div>
                        <div className="col-span-3 text-center text-gray-500">
                            {item.prep_qty} / {item.shoot_qty} / {item.post_qty}
                        </div>
                        <div className="col-span-2 text-right font-bold">
                            ${item.total.toLocaleString()}
                        </div>
                        <div className="col-span-1 text-right text-xs text-green-600">Saved</div>
                    </div>
                ))}

                {/* Active Editor */}
                {editorState.active && (
                    <InlineItemEditor
                        isLabor={editorState.type === 'labor'}
                        onSave={handleSave}
                        onCancel={() => setEditorState({ ...editorState, active: false })}
                    />
                )}

                {!editorState.active && (
                    <div className="text-center py-4 text-gray-400 italic bg-gray-50 rounded mt-2">
                        Click "Open Modal" above to start adding items
                    </div>
                )}
            </div>
        </div>
    );
}
