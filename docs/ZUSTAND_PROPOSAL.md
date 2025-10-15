# Zustand State Management Proposal

## Current Pain Points

### 1. **No Channels Showing**
**Problem:** Scans panel shows "0 unscanned channels" even when channels exist.

**Root Cause:** Channels haven't been synced to database by Discord bot yet.

**Current Flow:**
```
User visits dashboard
  ↓
Page fetches guild from DB
  ↓
Scans panel fetches channels from DB
  ↓
Returns empty array (bot hasn't synced yet)
```

### 2. **Multiple API Calls**
```typescript
// GuildHeader component
const guild = await getSingleGuildById(guildId); // API call 1

// ChannelsList component  
const channels = await getChannelsByGuildId(guildId); // API call 2

// ScansPanel component
const { channels } = useGuildScanStatuses(guildId); // API call 3

// Each refetch = 3 more API calls
```

### 3. **State Synchronization Issues**
- Toggle scanning in header → Page reload required
- Start scan → Manual refresh required
- No real-time updates
- Components don't know about each other's state

### 4. **Poor UX**
- Loading states everywhere
- Stale data
- Manual refresh buttons
- Page reloads on toggle

## Zustand Solution

### Architecture

```typescript
// stores/guildStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface GuildState {
  // Data
  guild: Guild | null;
  channels: Channel[];
  scanStatuses: Record<string, ChannelScanStatus>;
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchGuild: (guildId: string) => Promise<void>;
  toggleScanning: (enabled: boolean) => Promise<void>;
  fetchChannels: () => Promise<void>;
  fetchScanStatuses: () => Promise<void>;
  updateScanStatus: (channelId: string, status: ScanStatus) => void;
  
  // Real-time
  subscribeToUpdates: (guildId: string) => () => void;
}

export const useGuildStore = create<GuildState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        guild: null,
        channels: [],
        scanStatuses: {},
        loading: false,
        error: null,
        
        // Fetch guild data
        fetchGuild: async (guildId) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`/api/guilds/${guildId}`);
            const guild = await response.json();
            set({ guild, loading: false });
          } catch (error) {
            set({ error: error.message, loading: false });
          }
        },
        
        // Toggle scanning (optimistic update)
        toggleScanning: async (enabled) => {
          const { guild } = get();
          if (!guild) return;
          
          // Optimistic update
          set({ 
            guild: { ...guild, message_scan_enabled: enabled } 
          });
          
          try {
            await fetch(`/api/guilds/${guild.id}/toggle`, {
              method: 'POST',
              body: JSON.stringify({ enabled }),
            });
          } catch (error) {
            // Rollback on error
            set({ 
              guild: { ...guild, message_scan_enabled: !enabled },
              error: error.message 
            });
          }
        },
        
        // Fetch channels
        fetchChannels: async () => {
          const { guild } = get();
          if (!guild) return;
          
          const response = await fetch(`/api/guilds/${guild.id}/channels`);
          const channels = await response.json();
          set({ channels });
        },
        
        // Fetch scan statuses
        fetchScanStatuses: async () => {
          const { guild } = get();
          if (!guild) return;
          
          const response = await fetch(`/api/guilds/${guild.id}/scan-statuses`);
          const { channels } = await response.json();
          
          // Convert to map for easy lookup
          const scanStatuses = channels.reduce((acc, ch) => {
            if (ch.status) {
              acc[ch.channelId] = ch;
            }
            return acc;
          }, {});
          
          set({ scanStatuses });
        },
        
        // Update single scan status (for real-time updates)
        updateScanStatus: (channelId, status) => {
          const { scanStatuses } = get();
          set({
            scanStatuses: {
              ...scanStatuses,
              [channelId]: { ...scanStatuses[channelId], status }
            }
          });
        },
        
        // Subscribe to real-time updates (WebSocket/SSE)
        subscribeToUpdates: (guildId) => {
          // TODO: Implement WebSocket connection
          // const ws = new WebSocket(`/api/guilds/${guildId}/subscribe`);
          // ws.onmessage = (event) => {
          //   const update = JSON.parse(event.data);
          //   get().updateScanStatus(update.channelId, update.status);
          // };
          // return () => ws.close();
          return () => {};
        },
      }),
      {
        name: 'guild-storage',
        partialize: (state) => ({ 
          // Only persist guild and channels
          guild: state.guild,
          channels: state.channels,
        }),
      }
    )
  )
);
```

### Component Usage

**Before (Multiple fetches):**
```typescript
// GuildHeader.tsx
export function GuildHeader({ guildId, messageScanEnabled }) {
  const [toggling, setToggling] = useState(false);
  
  const handleToggle = async () => {
    setToggling(true);
    await fetch(`/api/guilds/${guildId}/toggle`, ...);
    window.location.reload(); // 😱
  };
}

// ScansPanel.tsx
export function ScansPanel({ guildId }) {
  const { channels, loading } = useGuildScanStatuses(guildId);
  // Separate fetch, no coordination
}
```

**After (Shared state):**
```typescript
// GuildHeader.tsx
export function GuildHeader() {
  const guild = useGuildStore(state => state.guild);
  const toggleScanning = useGuildStore(state => state.toggleScanning);
  
  const handleToggle = () => {
    toggleScanning(!guild.message_scan_enabled);
    // Instant UI update, no reload! ✨
  };
}

// ScansPanel.tsx
export function ScansPanel() {
  const channels = useGuildStore(state => state.channels);
  const scanStatuses = useGuildStore(state => state.scanStatuses);
  // Same data, no extra fetch! ✨
}

// GuildPage.tsx (Server Component)
export default async function GuildPage({ params }) {
  const guild = await getSingleGuildById(guildId);
  const channels = await getChannelsByGuildId(guildId);
  
  return (
    <GuildPageClient 
      initialGuild={guild} 
      initialChannels={channels} 
    />
  );
}

// GuildPageClient.tsx (Client Component)
'use client';
export function GuildPageClient({ initialGuild, initialChannels }) {
  const initStore = useGuildStore(state => state.init);
  
  useEffect(() => {
    // Hydrate store with server data
    initStore(initialGuild, initialChannels);
  }, []);
  
  return <GuildTabs />;
}
```

## Benefits

### 1. **Single Source of Truth**
- All components read from same store
- No synchronization issues
- Consistent state everywhere

### 2. **Optimistic Updates**
```typescript
// Toggle feels instant
toggleScanning(true);
// UI updates immediately
// API call happens in background
// Rollback if fails
```

### 3. **Efficient Data Fetching**
```typescript
// Fetch once on page load
fetchGuild(guildId);
fetchChannels();
fetchScanStatuses();

// All components use cached data
// No refetches on tab changes
```

### 4. **Real-time Ready**
```typescript
// Easy to add WebSocket updates
useEffect(() => {
  const unsubscribe = subscribeToUpdates(guildId);
  return unsubscribe;
}, [guildId]);

// Scan status updates automatically
// No polling needed
```

### 5. **Persistence**
```typescript
// Survives page refresh
// Instant load from localStorage
// Revalidate in background
```

### 6. **DevTools**
```typescript
// Redux DevTools integration
// Time-travel debugging
// Action history
// State inspection
```

## Implementation Plan

### Phase 1: Basic Store (1-2 hours)
- [ ] Install Zustand
- [ ] Create guild store
- [ ] Add basic actions (fetch, toggle)
- [ ] Migrate GuildHeader to use store

### Phase 2: Channels & Scans (1-2 hours)
- [ ] Add channels to store
- [ ] Add scan statuses to store
- [ ] Migrate ScansPanel to use store
- [ ] Remove redundant API calls

### Phase 3: Optimistic Updates (1 hour)
- [ ] Implement optimistic toggle
- [ ] Implement optimistic scan start
- [ ] Add error rollback

### Phase 4: Real-time (2-3 hours)
- [ ] Add WebSocket/SSE endpoint
- [ ] Implement subscription logic
- [ ] Auto-update scan statuses
- [ ] Remove manual refresh buttons

### Phase 5: Persistence (30 min)
- [ ] Add persist middleware
- [ ] Configure what to persist
- [ ] Add revalidation logic

## Migration Strategy

### Step 1: Install
```bash
npm install zustand
```

### Step 2: Create Store
```typescript
// src/stores/guildStore.ts
export const useGuildStore = create(...);
```

### Step 3: Hydrate from Server
```typescript
// page.tsx (Server Component)
const guild = await getSingleGuildById(guildId);

// Pass to client component
<GuildPageClient initialGuild={guild} />
```

### Step 4: Migrate Components One by One
- Start with GuildHeader (simple)
- Then ScansPanel (complex)
- Then ChannelsList
- Finally Settings

### Step 5: Remove Old Hooks
- Delete `useGuildScanStatuses` (replaced by store)
- Keep API routes (store calls them)

## Alternatives Considered

### 1. **React Query / TanStack Query**
**Pros:**
- Built for data fetching
- Automatic caching
- Background refetch

**Cons:**
- Overkill for this use case
- Harder to do optimistic updates
- Less control over state shape

### 2. **Redux Toolkit**
**Pros:**
- Industry standard
- Powerful DevTools
- Great TypeScript support

**Cons:**
- More boilerplate
- Steeper learning curve
- Overkill for small app

### 3. **Jotai / Recoil**
**Pros:**
- Atomic state
- Fine-grained updates

**Cons:**
- Less mature
- Smaller ecosystem
- Harder to debug

### 4. **Context + useReducer**
**Pros:**
- Built-in to React
- No dependencies

**Cons:**
- Verbose
- No DevTools
- No persistence
- Performance issues with large state

## Recommendation

**✅ Use Zustand**

**Why:**
- Perfect size for this app
- Easy to learn (1 hour)
- Great DX
- Powerful enough for real-time
- Minimal boilerplate
- Excellent TypeScript support

**When:**
- **Now** - You're hitting the pain points
- Before adding more features
- Before implementing real-time updates

**Effort:**
- Initial setup: 2-3 hours
- Full migration: 1 day
- Real-time: +1 day

**ROI:**
- Better UX (instant updates)
- Cleaner code (less duplication)
- Easier to add features
- Foundation for real-time

## Next Steps

1. ✅ Fix immediate issue (debug panel added)
2. ⏳ Decide on Zustand (recommended: yes)
3. ⏳ Install and create basic store
4. ⏳ Migrate one component as proof of concept
5. ⏳ Migrate remaining components
6. ⏳ Add real-time updates

---

**TL;DR:** Zustand is the right choice. Implement it now before the app grows larger. It will solve your current issues and enable real-time features later.
