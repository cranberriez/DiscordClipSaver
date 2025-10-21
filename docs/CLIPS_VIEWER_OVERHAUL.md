# Clips Viewer Overhaul

Complete redesign of the clips viewer with centralized filtering, persistent state, and improved UX.

## Overview

The clips viewer has been overhauled from a route-based navigation system to a centralized single-page application with modal-based filtering and persistent state management.

## Key Features

### 1. **Centralized /clips Page**
- Single page for all clip browsing
- No more route navigation between guilds
- Persistent filter state across sessions
- Auto-opens guild modal on first visit

### 2. **Zustand State Management**
- Persistent filter state with localStorage
- Tracks: selected guild, channels, authors, search query, sort order
- Modal open/close states
- Automatic reset of dependent filters (channels/authors reset when guild changes)

### 3. **Modal-Based Filtering**
- **Guild Selection Modal**: Shows guilds with clip counts
- **Channel Selection Modal**: Multi-select with "Select All" / "Clear All"
- **Author Selection Modal**: Multi-select (placeholder for future implementation)
- All modals include search functionality for easy filtering

### 4. **Sticky Filter Bar**
- Remains visible while scrolling
- Shows current selections (guild name, channel count, author count)
- Quick access to all filter modals
- Sort order toggle (newest/oldest first)
- Search input for client-side filtering

### 5. **Enhanced Clip Cards**
- **16:9 aspect ratio** thumbnails (larger, more cinematic)
- **Author display** with avatar and name using new UserAvatar component
- **Time posted** in relative format ("2 days ago", "3 months ago")
- **Play button overlay** on hover
- **Duration badge** on thumbnail
- **Resolution display** (if available)

### 6. **Server-Side Filtering**
- Channel filtering done server-side for proper pagination
- Supports multiple channel selection via comma-separated IDs
- Sort order passed to database queries
- Ensures all clips are accessible regardless of pagination

### 7. **Client-Side Search**
- Filters already-loaded clips by filename or message content
- Instant results without API calls
- Works alongside server-side channel filtering

## Architecture

### State Management (Zustand)
```
interface/src/features/clips/stores/useClipFiltersStore.ts
```
- Persistent store with localStorage
- Manages all filter state and modal visibility
- Automatic cleanup of dependent filters

### Components

#### Modals
```
interface/src/features/clips/components/modals/
├── GuildSelectModal.tsx      # Guild selection with clip counts
├── ChannelSelectModal.tsx    # Multi-select channels with search
├── AuthorSelectModal.tsx     # Multi-select authors (placeholder)
└── index.ts
```

#### UI Components
```
interface/src/features/clips/components/
├── FilterBar.tsx             # Sticky filter bar
├── ClipCard.tsx              # Enhanced clip card with 16:9 thumbnails
└── ClipModal.tsx             # Video player modal (existing)

interface/src/components/user/
└── UserAvatar.tsx            # Reusable user avatar component
```

#### Utilities
```
interface/src/lib/utils/
└── time.ts                   # Time formatting utilities
```

### API Layer

#### New Routes
```
GET /api/guilds/with-clips
- Returns guilds with clip counts
- Filters guilds with 0 clips
- Used for guild selection modal

GET /api/guilds/[guildId]/channels/stats (existing)
- Returns channels with clip counts
- Used for channel selection modal
```

#### Updated Routes
```
GET /api/guilds/[guildId]/clips
- Added: channelIds parameter (comma-separated, multiple channels)
- Added: sort parameter ("asc" | "desc")
- Changed: channelId → channelIds for multi-select support
```

### Database Layer

#### New Queries
```typescript
// interface/src/server/db/queries/guilds.ts
getGuildsByIdsWithClipCount(guildIds: string[]): Promise<GuildWithClipCount[]>
- Joins guild and clip tables
- Returns guilds with clip counts
- Filters soft-deleted guilds and clips

// interface/src/server/db/queries/clips.ts
getClipsByChannelIds(channelIds: string[], limit, offset, sort): Promise<ClipWithMetadata[]>
- Fetches clips from multiple channels
- Supports sort order parameter
- Maintains 2x fetch limit for deleted message filtering
```

#### Updated Queries
All clip queries now support sort parameter:
- `getClipsByGuildId(guildId, limit, offset, sort)`
- `getClipsByChannelId(channelId, limit, offset, sort)`
- `getClipsByChannelIds(channelIds, limit, offset, sort)`

### DataService Updates
```typescript
// interface/src/server/services/data-service.ts
- Added: getClipsByChannelIds() method
- Updated: All clip methods now accept sort parameter
```

## UI/UX Improvements

### Filter Bar
- **Sticky positioning**: Stays visible while scrolling
- **Disabled states**: Channel/Author buttons disabled until guild selected
- **Visual feedback**: Shows current selections in button text
- **Sort toggle**: Dropdown for newest/oldest first

### Clip Cards
- **Larger thumbnails**: 16:9 aspect ratio for better visibility
- **Hover effects**: Scale animation and play button overlay
- **Author info**: Avatar and name displayed below title
- **Time context**: Shows when clip was posted
- **Better spacing**: More padding and gap between cards

### Modals
- **Search functionality**: All modals have search bars
- **Bulk actions**: Select All / Clear All for multi-select modals
- **Selection counter**: Shows "X of Y selected"
- **Visual selection**: Selected items highlighted with primary color
- **Responsive grid**: 1-2 columns based on screen size

## Data Flow

```
User Action → Zustand Store → React Query → API Route → DataService → Database
     ↓              ↓              ↓
  UI Update ← State Change ← Cache Update
```

### Example: Selecting Channels
1. User clicks "Channels" button → Opens ChannelSelectModal
2. User selects channels → Updates `selectedChannelIds` in Zustand
3. React Query detects state change → Refetches clips with new channelIds
4. API route receives channelIds → Calls DataService.getClipsByChannelIds()
5. Database query filters by channel IDs → Returns clips
6. UI updates with filtered clips

## Migration Notes

### Breaking Changes
- `/clips/[guildId]` route is now deprecated (still exists but not used)
- Old ClipGrid component replaced with ClipCard for individual cards
- Channel filtering now uses `channelIds` (plural) instead of `channelId`

### Backward Compatibility
- Old `/clips/[guildId]` route still functional
- Existing ClipModal component unchanged
- All existing API routes still work

## Dependencies

### Required Package
```bash
npm install @radix-ui/react-checkbox
```

This package is required for the Checkbox component used in the channel and author selection modals.

### Existing Dependencies
- `zustand` - Already installed, used for state management
- `@tanstack/react-query` - Already installed, used for data fetching
- `@radix-ui/react-dialog` - Already installed, used for modals

## Future Enhancements

### Author Filtering
- Fetch unique authors from clips
- Display author avatars from Discord CDN
- Filter clips by selected authors
- Server-side author filtering for performance

### Advanced Filters
- Date range picker
- Duration filter (short/medium/long clips)
- Resolution filter (720p, 1080p, etc.)
- File size filter

### Infinite Scroll
- Replace "Load More" button with intersection observer
- Automatically load more clips as user scrolls
- Better UX for large clip collections

### Clip Actions
- Bulk download selected clips
- Share clip links
- Add to favorites/playlists
- Delete clips (with confirmation)

## Files Created

### Components
- `interface/src/features/clips/stores/useClipFiltersStore.ts`
- `interface/src/features/clips/components/FilterBar.tsx`
- `interface/src/features/clips/components/ClipCard.tsx`
- `interface/src/features/clips/components/modals/GuildSelectModal.tsx`
- `interface/src/features/clips/components/modals/ChannelSelectModal.tsx`
- `interface/src/features/clips/components/modals/AuthorSelectModal.tsx`
- `interface/src/features/clips/components/modals/index.ts`
- `interface/src/components/user/UserAvatar.tsx`
- `interface/src/components/user/index.ts`
- `interface/src/components/ui/checkbox.tsx`
- `interface/src/lib/utils/time.ts`

### API Routes
- `interface/src/app/api/guilds/with-clips/route.ts`

### Database
- Updated: `interface/src/server/db/queries/guilds.ts`
- Updated: `interface/src/server/db/queries/clips.ts`
- Updated: `interface/src/server/db/index.ts`

## Files Modified

### Pages
- `interface/src/app/clips/page.tsx` - Complete rewrite

### API Routes
- `interface/src/app/api/guilds/[guildId]/clips/route.ts` - Added channelIds and sort params

### Services
- `interface/src/server/services/data-service.ts` - Added sort params and new methods

### Exports
- `interface/src/features/clips/index.ts` - Added new component exports

## Testing Checklist

- [ ] Install `@radix-ui/react-checkbox` package
- [ ] Navigate to `/clips` page
- [ ] Verify guild modal auto-opens on first visit
- [ ] Select a guild from modal
- [ ] Verify clips load correctly
- [ ] Test channel selection modal (multi-select)
- [ ] Test search functionality in modals
- [ ] Test client-side search in filter bar
- [ ] Test sort order toggle (newest/oldest)
- [ ] Verify filter bar stays sticky on scroll
- [ ] Test clip card hover effects
- [ ] Verify author avatars display correctly
- [ ] Test "Load More" pagination
- [ ] Verify state persists across page refreshes
- [ ] Test with guilds that have no clips
- [ ] Test with channels that have no clips

## Performance Considerations

### Optimizations
- **Persistent state**: Reduces unnecessary API calls on page reload
- **Server-side filtering**: Ensures efficient database queries
- **Client-side search**: Instant results without API calls
- **React Query caching**: Prevents redundant fetches
- **Lazy loading**: Only fetch clips when guild selected

### Potential Issues
- Large channel lists may slow down modal rendering
- Many clips (1000+) may cause memory issues with infinite scroll
- Author fetching not yet implemented (placeholder for now)

## Conclusion

This overhaul significantly improves the clips viewer UX with:
- ✅ Centralized filtering interface
- ✅ Persistent state across sessions
- ✅ Better visual presentation (16:9 thumbnails)
- ✅ Multi-select channel filtering
- ✅ Sort order control
- ✅ Improved search functionality
- ✅ Sticky filter bar for easy access
- ✅ Author display with avatars

The architecture is now more scalable and maintainable, with clear separation between state management, data fetching, and UI components.
