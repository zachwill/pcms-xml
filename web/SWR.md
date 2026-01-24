# SWR vs TanStack Query Evaluation

## Current State

Standardized on **SWR** for all Salary Book reads:

| Hook / View | Pattern | Cache | Dedup |
|------------|---------|-------|-------|
| `useTeams` | ✅ SWR | ✅ | ✅ |
| `usePlayers(teamCode)` | ✅ SWR | ✅ | ✅ |
| `useTeamSalary(teamCode)` | ✅ SWR | ✅ | ✅ |
| `usePicks(teamCode)` | ✅ SWR | ✅ | ✅ |
| `useAgent(agentId)` | ✅ SWR | ✅ | ✅ |
| `usePlayer(playerId)` (Sidebar) | ✅ SWR | ✅ | ✅ |
| `usePickDetail({teamCode,year,round})` (Sidebar) | ✅ SWR | ✅ | ✅ |

## Why this matters

Previously we had a mixed approach (some hooks using SWR, others using local `useState/useEffect`).

That caused:
- Duplicate requests (same endpoint fetched from multiple components)
- No deduplication (mounting 6 components could mean 6 fetches)
- No stale-while-revalidate (navigating back/forward always refetched)

With SWR:
- Requests are **globally cached**
- Concurrent requests are **deduped**
- Navigating around the app is fast because cached data renders immediately

## Recommendation: Standardize on SWR

SWR is already installed and fits our current needs:
- read-heavy app
- simple key-based caching (teams → players/salary/picks)
- no complex mutations yet

TanStack Query is more powerful, but would be overkill unless we add:
- complex invalidation rules
- optimistic updates/mutations
- pagination/infinite queries

## Implementation notes

### Global defaults via `SWRConfig`

Configured in `web/src/client.tsx`:

```tsx
<SWRConfig value={{
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
}}>
  <App />
</SWRConfig>
```

### Sidebar fetches extracted into hooks

Instead of inline `useEffect` fetches:
- `PlayerDetail` uses `usePlayer(playerId)`
- `PickDetail` uses `usePickDetail(params)`

This keeps detail views cached and deduped like the rest of the app.
