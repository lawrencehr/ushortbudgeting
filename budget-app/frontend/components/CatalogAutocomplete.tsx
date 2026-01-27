import React, { useState, useEffect, useRef } from 'react';
import { CatalogItem } from '@/lib/api';

// Props
interface Props {
    value: string;
    onChange: (val: string) => void;
    onSelect: (item: CatalogItem) => void;
    className?: string;
    placeholder?: string;
    autoFocus?: boolean;
}

// Dummy fetcher until we wire up full API search
// In real app, import fetchCatalog or searchCatalog from api.ts
const searchCatalogMock = async (query: string): Promise<CatalogItem[]> => {
    // Simulated delay
    await new Promise(r => setTimeout(r, 200));
    const db: CatalogItem[] = [
        { description: "Camera Operator", default_rate: 800, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "Director of Photography", default_rate: 1200, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "1st Assistant Camera", default_rate: 650, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "2nd Assistant Camera", default_rate: 500, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "Boom Operator", default_rate: 550, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "Sound Mixer", default_rate: 850, default_category_id: "C", default_category_name: "Production Crew", is_labor: true },
        { description: "Camera Package (Alexa)", default_rate: 2500, default_category_id: "D", default_category_name: "Equipment", is_labor: false },
        { description: "Lighting Package (5-Ton)", default_rate: 1500, default_category_id: "D", default_category_name: "Equipment", is_labor: false },
    ];
    return db.filter(i => i.description.toLowerCase().includes(query.toLowerCase()));
};

export default function CatalogAutocomplete({ value, onChange, onSelect, className, placeholder, autoFocus }: Props) {
    const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (value.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(() => {
            setLoading(true);
            searchCatalogMock(value).then(results => {
                setSuggestions(results);
                setIsOpen(true);
                setLoading(false);
            });
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [value]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full border rounded p-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none ${className}`}
                placeholder={placeholder}
                autoFocus={autoFocus}
                onFocus={() => value.length >= 2 && setIsOpen(true)}
            />

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                        <li
                            key={idx}
                            className="px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm border-b last:border-b-0 border-gray-50 transition-colors"
                            onClick={() => {
                                onSelect(item);
                                setIsOpen(false);
                            }}
                        >
                            <div className="font-medium text-gray-800">{item.description}</div>
                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                                <span>{item.is_labor ? 'Labor' : 'Material'}</span>
                                <span>${item.default_rate}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
