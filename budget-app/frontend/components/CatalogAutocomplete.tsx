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
// Real API Search
const searchCatalog = async (query: string): Promise<CatalogItem[]> => {
    try {
        // Parallel search: Catalog + Roles History
        // For MVP, lets just hit Roles if it's labor? 
        // Or create a unified endpoint.
        // Let's hitting the new /api/roles/search endpoint
        const res = await fetch(`http://localhost:8000/api/roles/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return [];
        const roles = await res.json();

        // Map RoleHistory to CatalogItem
        return roles.map((r: any) => ({
            description: r.role_name,
            default_rate: r.base_rate,
            default_category_id: "LABOR",
            default_category_name: "History",
            is_labor: true
        }));
    } catch (err) {
        console.error("Search failed", err);
        return [];
    }
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
            searchCatalog(value).then(results => {
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
