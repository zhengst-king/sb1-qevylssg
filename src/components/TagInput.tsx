// src/components/TagInput.tsx
// Autocomplete tag input component

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import type { Tag, TagCategory } from '../types/customCollections';

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestCategory?: TagCategory;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags,
  suggestCategory,
  className = '',
}) => {
  const { tags, getOrCreateTag, filterTags } = useTags();
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update suggestions when input changes
  useEffect(() => {
    if (inputValue.trim().length > 0) {
      const filtered = filterTags(inputValue)
        .filter(tag => !selectedTags.find(st => st.id === tag.id));
      
      // Optionally filter by category
      const categorized = suggestCategory
        ? filtered.filter(tag => tag.category === suggestCategory)
        : filtered;
      
      setSuggestions(categorized.slice(0, 10));
      setShowSuggestions(categorized.length > 0);
      setSelectedIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, selectedTags, filterTags, suggestCategory]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = async (tagToAdd?: Tag) => {
    if (maxTags && selectedTags.length >= maxTags) {
      return;
    }

    try {
      let tag: Tag;
      
      if (tagToAdd) {
        tag = tagToAdd;
      } else {
        const trimmedValue = inputValue.trim();
        if (!trimmedValue) return;
        
        // Get or create tag
        tag = await getOrCreateTag(trimmedValue, suggestCategory);
      }

      // Check if tag already selected
      if (selectedTags.find(t => t.id === tag.id)) {
        return;
      }

      onTagsChange([...selectedTags, tag]);
      setInputValue('');
      setShowSuggestions(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (showSuggestions && suggestions.length > 0) {
        handleAddTag(suggestions[selectedIndex]);
      } else {
        handleAddTag();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Tag Container */}
      <div className="flex flex-wrap gap-2 p-3 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[44px]">
        {/* Selected Tags */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            <TagIcon className="h-3 w-3" />
            <span>{tag.name}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:bg-white hover:bg-opacity-30 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        {(!maxTags || selectedTags.length < maxTags) && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none text-sm"
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleAddTag(tag)}
              className={`w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between ${
                index === selectedIndex ? 'bg-slate-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm font-medium text-slate-900">{tag.name}</span>
                <span className="text-xs text-slate-500">{tag.category}</span>
              </div>
              <span className="text-xs text-slate-400">
                {tag.usage_count} {tag.usage_count === 1 ? 'use' : 'uses'}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Create New Tag Hint */}
      {inputValue.trim() && !showSuggestions && (
        <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
          <Plus className="h-3 w-3" />
          <span>Press Enter to create "{inputValue}"</span>
        </div>
      )}

      {/* Max Tags Warning */}
      {maxTags && selectedTags.length >= maxTags && (
        <div className="mt-1 text-xs text-amber-600">
          Maximum of {maxTags} tags reached
        </div>
      )}
    </div>
  );
};