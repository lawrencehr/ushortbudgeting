"use client";

import { useEffect, useState } from "react";
import { fetchCatalog, CatalogItem } from "@/lib/api";

interface Props {
  onAdd: (item: CatalogItem) => void;
}

export default function CatalogSearch({ onAdd }: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState<CatalogItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(console.error);
  }, []);

  useEffect(() => {
    if (!query) {
      setFiltered([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = catalog.filter((item) =>
      item.description.toLowerCase().includes(lowerQuery)
    );
    setFiltered(results.slice(0, 10)); // Limit to 10 results
  }, [query, catalog]);

  const handleSelect = (item: CatalogItem) => {
    onAdd(item);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex gap-2">
        <input
          type="text"
          className="w-full border rounded p-2 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="Search to add line item..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>
      
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              className="w-full text-left px-4 py-2 hover:bg-indigo-50 focus:bg-indigo-50 border-b last:border-b-0"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium text-gray-800">{item.description}</div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{item.default_category_id} - {item.default_category_name}</span>
                <span>${item.default_rate.toLocaleString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {isOpen && query && filtered.length === 0 && (
        <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 p-4 text-center text-gray-500">
           No matches found.
           {/* Future: Allow creating custom item here */}
        </div>
      )}
    </div>
  );
}
