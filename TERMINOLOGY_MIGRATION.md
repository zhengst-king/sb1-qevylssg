# Terminology Migration: "Collection" → "Media Library"

## Executive Summary

**Date**: November 2025  
**Status**: Completed  
**Scope**: My Discs physical media management system

This document describes the systematic refactoring of "Collection" terminology to "Media Library" throughout the physical disc management system to avoid confusion with TMDB franchise collections.

---

## Rationale

### The Problem
The term "Collection" was being used in two different contexts:
1. **TMDB Collections**: Movie franchises and series (e.g., "The Lord of the Rings Collection")
2. **User's Physical Media**: Personal disc library management system

This dual usage created confusion for users and developers, making it unclear whether references to "collections" meant franchise groupings or the user's personal disc library.

### The Solution
Rename the physical media management system from "Collections" to "Media Library" while keeping TMDB franchise collections unchanged. This creates clear semantic separation:
- **Media Library**: User's personal physical disc collection
- **Collections**: TMDB movie/TV franchises and series

---

## Database Mapping

**IMPORTANT**: Database schema remains unchanged to maintain backward compatibility and avoid migration complexity.

| UI/Code Term | Database Table | Database Field | Notes |
|--------------|----------------|----------------|-------|
| Media Library | `physical_media_collections` | - | Table name unchanged |
| Library Item | `PhysicalMediaCollection` | - | Type/interface name |
| Item Status | - | `collection_type` | Field name unchanged |
| Status Values | - | `owned`, `wishlist`, `for_sale`, `loaned_out`, `missing` | Enum values unchanged |

**Why keep database names unchanged?**
- Avoids complex database migrations
- Maintains existing RLS policies and indexes
- Preserves all foreign key relationships
- Zero downtime deployment
- Backward compatible with existing data

---

## Code Changes Summary

### Components Renamed

| Old Name | New Name | File Path |
|----------|----------|-----------|
| `MyCollectionsPage` | `MyMediaLibraryPage` | `src/components/MyMediaLibraryPage.tsx` |
| `CollectionItemCard` | `MediaLibraryItemCard` | `src/components/MediaLibraryItemCard.tsx` |
| `AddToCollectionModal` | `AddToLibraryModal` | `src/components/AddToLibraryModal.tsx` |
| `CollectionItemDetailModal` | `MediaLibraryItemDetailModal` | `src/components/MediaLibraryItemDetailModal.tsx` |
| `EditCollectionItemModal` | `EditLibraryItemModal` | `src/components/EditLibraryItemModal.tsx` |

### Hooks Renamed

| Old Name | New Name | File Path |
|----------|----------|-----------|
| `useCollections` | `useMediaLibrary` | `src/hooks/useMediaLibrary.ts` |

**Note**: Old `useCollections.ts` file has been removed. Use `useMediaLibrary` instead.

### Hook Function Changes

| Old Function | New Function | Purpose |
|--------------|--------------|---------|
| `collections` | `libraryItems` | State array of items |
| `addToCollection()` | `addToLibrary()` | Add item to library |
| `removeFromCollection()` | `removeFromLibrary()` | Remove item from library |
| `updateCollection()` | `updateLibraryItem()` | Update item details |
| `moveToCollectionType()` | `moveItemStatus()` | Change item status |
| `bulkUpdateCollections()` | `bulkUpdateLibraryItems()` | Bulk update items |
| `getAllCollections()` | `getAllLibraryItems()` | Fetch all items |
| `getCollectionStats()` | `getLibraryStats()` | Get statistics |
| `getCollectionValueStats()` | `getLibraryValueStats()` | Get value stats |
| `getItemsByType()` | `getItemsByStatus()` | Filter by status |
| `searchCollections()` | `searchLibrary()` | Search items |

### Services Renamed

**File**: `src/services/csvExportService.ts`

| Old Method | New Method |
|------------|------------|
| `generateCollectionCSV()` | `generateMediaLibraryCSV()` |
| `exportCollectionToCSV()` | `exportMediaLibraryToCSV()` |
| `fetchCollectionDataWithTechnicalSpecs()` | `fetchLibraryDataWithTechnicalSpecs()` |

**Default CSV filename**: `my-media-library-{date}.csv` (was `physical-media-collection-{date}.csv`)

### Type Definitions

**File**: `src/lib/supabase.ts`

```typescript
// New type aliases for semantic clarity
export type MediaLibraryItem = PhysicalMediaCollection;
export type ItemStatus = CollectionType;

// Original types still exist for backward compatibility
export interface PhysicalMediaCollection { ... }
export type CollectionType = 'owned' | 'wishlist' | 'for_sale' | 'loaned_out' | 'missing';
```

Components can import either way:
```typescript
// Old way (still works)
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';

// New way (preferred)
import type { MediaLibraryItem, ItemStatus } from '../lib/supabase';
```

### Route Changes

**File**: `src/App.tsx`

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/collections` | `/media-library` | Active route |
| `/collections` | Redirects to `/media-library` | Backward compatibility |

**Implementation**:
```typescript
{/* Redirect old route for backward compatibility */}
<Route path="/collections" element={<Navigate to="/media-library" replace />} />
{/* New Media Library route */}
<Route path="/media-library" element={<MyMediaLibraryPage />} />
```

---

## UI Text Changes

### Page Headers
- "My Disc Collections" → "My Media Library"
- "Manage your physical media collection" → "Manage your physical media library"
- "Your collection is empty" → "Your library is empty"

### Buttons & Actions
- "Add to Collection" → "Add to Library"
- "Edit Collection Item" → "Edit Library Item"
- "Import Lists to My Disc Collections" → "Import Lists to My Media Library"
- "Export Collection" → "Export Library"

### Messages
- "Collection item updated successfully" → "Library item updated successfully"
- "No collection items to export" → "No library items to export"
- "Collection item added" → "Library item added"

### Status Labels
The `collection_type` field is now referred to as "Status" in the UI:
- Display label: "Status"
- Values remain: Owned, Wishlist, For Sale, Loaned Out, Missing

---

## Migration Guide for Developers

### Updating Imports

**Before**:
```typescript
import { MyCollectionsPage } from './components/MyCollectionsPage';
import { useCollections } from './hooks/useCollections';
import { csvExportService } from './services/csvExportService';
```

**After**:
```typescript
import { MyMediaLibraryPage } from './components/MyMediaLibraryPage';
import { useMediaLibrary } from './hooks/useMediaLibrary';
import { csvExportService } from './services/csvExportService';
```

### Updating Component Usage

**Before**:
```typescript
function MyComponent() {
  const { 
    collections, 
    addToCollection, 
    removeFromCollection,
    updateCollection 
  } = useCollections();

  return (
    <div>
      {collections.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

**After**:
```typescript
function MyComponent() {
  const { 
    libraryItems, 
    addToLibrary, 
    removeFromLibrary,
    updateLibraryItem 
  } = useMediaLibrary();

  return (
    <div>
      {libraryItems.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### Updating CSV Export

**Before**:
```typescript
const result = await csvExportService.exportCollectionToCSV(userId);
const csv = csvExportService.generateCollectionCSV(collections);
```

**After**:
```typescript
const result = await csvExportService.exportMediaLibraryToCSV(userId);
const csv = csvExportService.generateMediaLibraryCSV(libraryItems);
```

### Updating Database Queries

**Database queries remain unchanged** - continue querying `physical_media_collections` table:
```typescript
// This is still correct
const { data } = await supabase
  .from('physical_media_collections')
  .select('*')
  .eq('user_id', userId);
```

---

## Testing Checklist

### Functional Testing
- [x] Add item to library
- [x] Edit library item details
- [x] Delete library item
- [x] Move item between statuses (owned → wishlist, etc.)
- [x] CSV export generates correct filename
- [x] CSV import accepts both old and new formats
- [x] Search and filter functionality works
- [x] Technical specs request works
- [x] All modals open and function correctly
- [x] Old route `/collections` redirects to `/media-library`

### Database Integrity
- [x] No database schema changes
- [x] RLS policies function correctly
- [x] Foreign key relationships intact
- [x] Indexes optimize queries as expected
- [x] Existing data loads correctly

### UI Consistency
- [x] All UI text uses "Media Library" terminology
- [x] No lingering "collection" references in user-facing text
- [x] Tooltips and help text updated
- [x] Error messages use correct terminology
- [x] Mobile responsive layout maintained

---

## Backward Compatibility

### Route Compatibility
✅ Old bookmarks to `/collections` automatically redirect to `/media-library`

### CSV Import Compatibility
✅ CSV files with old column headers are accepted during import

### Database Compatibility
✅ All existing data works without migration

### API Compatibility
⚠️ If you have external integrations querying the API:
- Database table names unchanged
- Field names unchanged
- No breaking changes to database structure

---

## Related Documents

- **Implementation Plan**: `Implementation_Plan__Rename__Collection__to__Media_Library__in_My_Discs_Scope.md`
- **Developer Guide**: `docs/MEDIA_LIBRARY_GUIDE.md`
- **Main README**: `README.md`

---

## Questions & Troubleshooting

### Q: Why wasn't the database table renamed?
**A**: To avoid complex migrations, maintain backward compatibility, and ensure zero-downtime deployment. The database is implementation detail; users only see "Media Library" in the UI.

### Q: Can I still use the old component names?
**A**: No, the old components have been removed. Update your imports to use the new names.

### Q: What about CSV files exported with old terminology?
**A**: CSV import supports both old and new header formats for maximum compatibility.

### Q: Do I need to update my database queries?
**A**: No. Continue querying `physical_media_collections` table and `collection_type` field as before.

### Q: What if I have bookmarks to `/collections`?
**A**: The old route automatically redirects to `/media-library`. Your bookmarks will continue to work.

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Nov 2025 | 1.0 | Initial refactoring completed |
|  |  | - All components renamed |
|  |  | - Hooks refactored |
|  |  | - Services updated |
|  |  | - Routes updated with redirect |
|  |  | - UI text updated throughout |

---

**Last Updated**: November 2025  
**Maintained By**: Tagflix Development Team