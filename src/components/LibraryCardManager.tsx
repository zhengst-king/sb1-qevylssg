// src/components/LibraryCardManager.tsx
// Component for managing user's library card information

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Save, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LibraryCard {
  id: string;
  library_name: string;
  card_number: string;
  library_system: string; // e.g., "Public Library System", "University Library"
  notes?: string;
  created_at: string;
}

export function LibraryCardManager() {
  const [cards, setCards] = useState<LibraryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCardNumbers, setShowCardNumbers] = useState<{[key: string]: boolean}>({});
  
  // Form state
  const [formData, setFormData] = useState({
    library_name: '',
    card_number: '',
    library_system: '',
    notes: ''
  });

  useEffect(() => {
    loadLibraryCards();
  }, []);

  const loadLibraryCards = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('user_library_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCards(data || []);
    } catch (error) {
      console.error('Error loading library cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_library_cards')
        .insert({
          user_id: user.id,
          library_name: formData.library_name,
          card_number: formData.card_number,
          library_system: formData.library_system,
          notes: formData.notes || null
        });

      if (error) throw error;

      // Reset form and reload
      setFormData({ library_name: '', card_number: '', library_system: '', notes: '' });
      setIsAdding(false);
      await loadLibraryCards();
    } catch (error) {
      console.error('Error adding library card:', error);
      alert('Failed to add library card');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_library_cards')
        .update({
          library_name: formData.library_name,
          card_number: formData.card_number,
          library_system: formData.library_system,
          notes: formData.notes || null
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setFormData({ library_name: '', card_number: '', library_system: '', notes: '' });
      await loadLibraryCards();
    } catch (error) {
      console.error('Error updating library card:', error);
      alert('Failed to update library card');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this library card?')) return;

    try {
      const { error } = await supabase
        .from('user_library_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadLibraryCards();
    } catch (error) {
      console.error('Error deleting library card:', error);
      alert('Failed to delete library card');
    }
  };

  const startEdit = (card: LibraryCard) => {
    setEditingId(card.id);
    setFormData({
      library_name: card.library_name,
      card_number: card.card_number,
      library_system: card.library_system,
      notes: card.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ library_name: '', card_number: '', library_system: '', notes: '' });
  };

  const toggleShowCardNumber = (cardId: string) => {
    setShowCardNumbers(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const maskCardNumber = (cardNumber: string): string => {
    if (cardNumber.length <= 4) return cardNumber;
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-slate-900">Library Cards</h3>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Card</span>
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Add Library Card</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Library Name *
              </label>
              <input
                type="text"
                value={formData.library_name}
                onChange={(e) => setFormData({ ...formData, library_name: e.target.value })}
                placeholder="e.g., Downtown Public Library"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Card Number *
              </label>
              <input
                type="text"
                value={formData.card_number}
                onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                placeholder="Library card number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Library System *
              </label>
              <select
                value={formData.library_system}
                onChange={(e) => setFormData({ ...formData, library_system: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select system</option>
                <option value="public">Public Library</option>
                <option value="university">University Library</option>
                <option value="school">School Library</option>
                <option value="special">Special Library</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleAdd}
                disabled={!formData.library_name || !formData.card_number || !formData.library_system}
                className="flex-1 inline-flex items-center justify-center space-x-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-lg text-sm transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Cards List */}
      {cards.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No library cards added yet</p>
          <p className="text-xs mt-1">Add your library card to quickly access Kanopy and Hoopla</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="p-4 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors"
            >
              {editingId === card.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Library Name
                    </label>
                    <input
                      type="text"
                      value={formData.library_name}
                      onChange={(e) => setFormData({ ...formData, library_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={formData.card_number}
                      onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Library System
                    </label>
                    <select
                      value={formData.library_system}
                      onChange={(e) => setFormData({ ...formData, library_system: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="public">Public Library</option>
                      <option value="university">University Library</option>
                      <option value="school">School Library</option>
                      <option value="special">Special Library</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdate(card.id)}
                      className="flex-1 inline-flex items-center justify-center space-x-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{card.library_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {card.library_system.replace('_', ' ')} Library
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleShowCardNumber(card.id)}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                        title={showCardNumbers[card.id] ? "Hide card number" : "Show card number"}
                      >
                        {showCardNumbers[card.id] ? (
                          <EyeOff className="h-4 w-4 text-slate-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                      <button
                        onClick={() => startEdit(card)}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                        title="Edit card"
                      >
                        <Edit2 className="h-4 w-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Delete card"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-slate-600">Card Number: </span>
                    <span className="font-mono text-slate-900">
                      {showCardNumbers[card.id] ? card.card_number : maskCardNumber(card.card_number)}
                    </span>
                  </div>
                  
                  {card.notes && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                      {card.notes}
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-slate-100 flex space-x-2">
                    <a
                      href={`https://www.kanopy.com/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 underline"
                    >
                      Access Kanopy
                    </a>
                    <span className="text-slate-300">•</span>
                    <a
                      href={`https://www.hoopladigital.com/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-700 underline"
                    >
                      Access Hoopla
                    </a>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>Note:</strong> Your library card information is stored securely and only used to 
          help you quickly access digital library services like Kanopy and Hoopla.
        </p>
      </div>
    </div>
  );
}