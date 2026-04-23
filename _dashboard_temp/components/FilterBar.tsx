'use client';

import { useState, useEffect, useRef } from 'react';
import { FUNNEL_STAGE_OPTIONS, getFunnelStageColor } from '@/lib/constants';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStages: string[];
  onStagesChange: (stages: string[]) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedStages,
  onStagesChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStage = (stage: string) => {
    if (selectedStages.includes(stage)) {
      onStagesChange(selectedStages.filter(s => s !== stage));
    } else {
      onStagesChange([...selectedStages, stage]);
    }
  };

  const clearFilters = () => {
    onStagesChange([]);
    onSearchChange('');
  };

  return (
    <div className="p-3 border-b border-gray-200 bg-white">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          placeholder="Search name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
        />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`
              px-3 py-1.5 text-sm border rounded-lg transition-colors flex items-center gap-1
              ${selectedStages.length > 0
                ? 'border-terracotta bg-terracotta/5 text-terracotta'
                : 'border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            Stage
            {selectedStages.length > 0 && (
              <span className="bg-terracotta text-white text-xs px-1.5 py-0.5 rounded-full">
                {selectedStages.length}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-2 max-h-64 overflow-y-auto">
                {FUNNEL_STAGE_OPTIONS.map((stage) => (
                  <label
                    key={stage}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStages.includes(stage)}
                      onChange={() => toggleStage(stage)}
                      className="rounded border-gray-300 text-terracotta focus:ring-terracotta"
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getFunnelStageColor(stage) }}
                    />
                    <span className="text-sm">{stage}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Showing {filteredCount} of {totalCount}
        </span>
        {(selectedStages.length > 0 || searchQuery) && (
          <button
            onClick={clearFilters}
            className="text-xs text-terracotta hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
