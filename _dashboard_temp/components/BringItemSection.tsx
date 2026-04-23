'use client';

import { useState, useCallback, useMemo } from 'react';
import BringItemRow from './BringItemRow';
import type { BringItem } from '@/lib/types';
import { BRING_ITEM_CATEGORIES } from '@/lib/constants';

interface BringItemSectionProps {
  items: BringItem[];
  onAdd: (category: string, description: string | null, slots: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function BringItemSection({ items, onAdd, onDelete }: BringItemSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<string>(BRING_ITEM_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSlots, setNewSlots] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, BringItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const category = newCategory === 'Other' ? customCategory : newCategory;
    if (!category.trim()) return;

    setIsAdding(true);
    try {
      await onAdd(category, newDescription || null, newSlots);
      setNewCategory(BRING_ITEM_CATEGORIES[0]);
      setCustomCategory('');
      setNewDescription('');
      setNewSlots(1);
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  }, [newCategory, customCategory, newDescription, newSlots, onAdd]);

  const totalSlots = items.reduce((sum, item) => sum + item.slots, 0);
  const claimedSlots = items.reduce((sum, item) => sum + (item.claims?.length || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">What to Bring</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {claimedSlots} of {totalSlots} slots claimed
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-terracotta hover:text-terracotta-dark"
        >
          {showAddForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              >
                {BRING_ITEM_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {newCategory === 'Other' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Category</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slots</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newSlots}
                onChange={(e) => setNewSlots(parseInt(e.target.value) || 1)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="e.g., Red or white wine..."
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-terracotta focus:border-terracotta"
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="px-4 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-dark transition-colors disabled:opacity-50"
          >
            {isAdding ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      )}

      {/* Items List */}
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No items yet. Add items for guests to bring.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryItems.map(item => (
                    <BringItemRow
                      key={item.id}
                      item={item}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
