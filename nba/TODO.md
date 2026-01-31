# NBA Data Import — TODO

This document outlines how to import data from the NBA APIs into the `nba` Postgres schema defined in `nba/schema/`.

---

## Overview

### Data Sources

| Source | Base URL | Auth | Format |
|--------|----------|------|--------|
| NBA Stats API | `https://api.nba.com/v0` | `X-NBA-Api-Key` header | JSON |
| NBA Hustle Stats | `https://api.nba.com/v0/api/hustlestats` | `X-NBA-Api-Key` header | XML |
| NBA Tracking API | `https://api.nba.com/v0/api/tracking` | `X-NBA-Api-Key` header | JSON |
| NGSS (Genius Sports) | varies | `x-api-key` header | JSON/XML |

### Import Strategy

All tables use **UPSERT** (`INSERT ... ON CONFLICT ... DO UPDATE`) to handle:
- Initial loads
- Incremental updates
- Re-fetches of the same data

Every table has `created_at`, `updated_at`, and `fetched_at` timestamps for tracking.

---

## Import Order (Dependency Graph)

Tables must be loaded in order due to foreign key constraints:

```
PHASE 1: Reference Data (no dependencies)
├── nba.teams          ← /api/stats/team/index
└── nba.players        ← /api/stats/player/index

PHASE 2: Season Metadata
├── nba.schedules      ← /api/schedule/full + /api/schedule/seasoncalendar
└── nba.standings      ← /api/standings/league (daily snapshots)

PHASE 3: Games
├── nba.games          ← /api/scores/scoreboard/date (per day)
├── nba.ngss_games     ← NGSS /Games/{gameId}
└── nba.playoff_series ← /api/scores/playoff/seriessummary

PHASE 4: Game-Level Data (depends on games, players, teams)
├── nba.boxscores_traditional      ← /api/stats/boxscore?measureType=Traditional
├── nba.boxscores_advanced         ← /api/stats/boxscore?measureType=Advanced
├── nba.boxscores_traditional_team ← (extracted from boxscore response)
├── nba.play_by_play               ← /api/stats/pbp
├── nba.players_on_court           ← /api/stats/poc
├── nba.hustle_stats               ← /{gameId}_hustlestats.xml
├── nba.hustle_stats_team          ← /{gameId}_hustlestats.xml (Team_Stats block)
├── nba.hustle_events              ← /{gameId}_HustleStatsGameEvents.xml
├── nba.tracking_stats             ← tracking processor outputs
├── nba.ngss_boxscores             ← NGSS /games/{gameId}/boxscore
├── nba.ngss_pbp                   ← NGSS /games/{gameId}/playbyplay
├── nba.ngss_officials             ← NGSS /Games/{gameId}/officials
└── nba.ngss_rosters               ← NGSS /Games/{gameId}/rosters

PHASE 5: Aggregated Stats (depends on players, teams)
├── nba.player_stats_aggregated    ← /api/stats/player (per season/type/mode)
├── nba.team_stats_aggregated      ← /api/stats/team (per season/type/mode)
├── nba.lineup_stats_season        ← /api/stats/rosterlineup (season aggregates)
└── nba.lineup_stats_game          ← /api/stats/rosterlineup (game-level)

PHASE 6: Supplemental (depends on games, players, teams)
├── nba.injuries                   ← /api/stats/injury
├── nba.alerts                     ← /api/alerts/topNAlerts
├── nba.pregame_storylines         ← /api/alerts/topNPregameStorylines
└── nba.tracking_streams           ← /api/tracking/game_streams
```

---

## Table-by-Table Import Specs

### Phase 1: Reference Data

#### `nba.teams`
- **Endpoint**: `GET /api/stats/team/index`
- **Params**: `leagueId=00` (NBA), `10` (WNBA), `20` (G League)
- **Frequency**: Daily or on-demand
- **UPSERT Key**: `team_id`
- **Notes**: Arena info comes from this endpoint. Also capture `ngss_team_id` if available from NGSS `/teams`.

#### `nba.players`
- **Endpoint**: `GET /api/stats/player/index`
- **Params**: `leagueId=00`, optionally `season=2024-25`
- **Frequency**: Daily
- **UPSERT Key**: `nba_id`
- **Notes**: `current_team_id` changes frequently for traded players. Map `ngss_person_id` from NGSS rosters.

---

### Phase 2: Season Metadata

#### `nba.schedules`
- **Endpoints**:
  - `GET /api/schedule/full?leagueId=00&season=2024-25`
  - `GET /api/schedule/seasoncalendar?leagueId=00&gameDate=TODAY`
  - `GET /api/schedule/broadcasters?leagueId=00&season=2024-25`
- **Frequency**: Once per season, refresh weekly
- **UPSERT Key**: `(season_year, league_id)`
- **Notes**: Store raw JSON in `full_schedule_json`, `season_calendar_json`, `broadcasters_json`. Extract `weeks_json` and season IDs.

#### `nba.standings`
- **Endpoint**: `GET /api/standings/league?leagueId=00&season=2024-25&seasonType=Regular%20Season`
- **Frequency**: Daily during season
- **UPSERT Key**: `(league_id, season_year, season_type, team_id, standing_date)`
- **Notes**: Capture `standing_date` from response metadata. Each fetch creates a new snapshot row (historical tracking).

---

### Phase 3: Games

#### `nba.games`
- **Endpoint**: `GET /api/scores/scoreboard/date?leagueId=00&gameDate=2024-01-15`
- **Alternative**: `GET /api/scores/scoreboard/games?gameId=0022400123`
- **Frequency**: 
  - Live games: every 30s–60s
  - Final games: once after completion
  - Historical: backfill by date range
- **UPSERT Key**: `game_id`
- **Notes**: 
  - `game_status`: 1=Pregame, 2=Live, 3=Final
  - Store full response in `game_json`
  - Extract broadcasters into arrays
  - Link `ngss_game_id` from NGSS mapping

#### `nba.ngss_games`
- **Endpoint**: NGSS `GET /Games/{gameId}`
- **Frequency**: After game completion
- **UPSERT Key**: `game_id` (mapped from NGSS ID)
- **Notes**: Rulesets from `GET /Games/{gameId}/ruleset` → `ruleset_json`

#### `nba.playoff_series`
- **Endpoint**: `GET /api/scores/playoff/seriessummary?leagueId=00&season=2024-25`
- **Frequency**: During playoffs
- **UPSERT Key**: `series_id`

---

### Phase 4: Game-Level Data

#### `nba.boxscores_traditional`
- **Endpoint**: `GET /api/stats/boxscore?gameId=0022400123&measureType=Traditional`
- **Frequency**: After game completion (or during for live)
- **UPSERT Key**: `(game_id, nba_id)`
- **Transform**:
  - Convert `minutes` from ISO duration (`PT34M12.00S`) to `interval`
  - Convert `played`, `starter` from "1"/"0" to boolean
  - Calculate `fg2m = fgm - fg3m`, `fg2a = fga - fg3a`

#### `nba.boxscores_advanced`
- **Endpoint**: `GET /api/stats/boxscore?gameId=0022400123&measureType=Advanced`
- **UPSERT Key**: `(game_id, nba_id)`
- **Notes**: Only available after game is final

#### `nba.boxscores_traditional_team`
- **Source**: Same endpoint as traditional boxscore (team totals block)
- **UPSERT Key**: `(game_id, team_id)`

#### `nba.play_by_play`
- **Endpoint**: `GET /api/stats/pbp?gameId=0022400123`
- **Frequency**: After game completion
- **UPSERT Key**: `game_id`
- **Notes**: Store entire actions array in `pbp_json`. One row per game.

#### `nba.players_on_court`
- **Endpoint**: `GET /api/stats/poc?gameId=0022400123`
- **UPSERT Key**: `game_id`
- **Notes**: Store as JSONB. Critical for lineup analysis.

#### `nba.hustle_stats`
- **Endpoint**: `GET /api/hustlestats/{gameId}_hustlestats.xml`
- **Format**: XML
- **UPSERT Key**: `(game_id, nba_id)`
- **Transform**: Parse XML, map abbreviations (CFG → contested_field_goals, etc.)

#### `nba.hustle_stats_team`
- **Source**: Same XML, `<Team_Stats>` block
- **UPSERT Key**: `(game_id, team_id)`

#### `nba.hustle_events`
- **Endpoint**: `GET /api/hustlestats/{gameId}_HustleStatsGameEvents.xml`
- **UPSERT Key**: `game_id`
- **Notes**: Store as `hustle_events_json` after XML→JSON conversion

#### `nba.tracking_stats`
- **Source**: Tracking processor outputs (PassBoxScore, TrackingBoxScore)
- **UPSERT Key**: `(game_id, nba_id)`

#### `nba.ngss_boxscores`
- **Endpoint**: NGSS `GET /games/{gameId}/boxscore`
- **UPSERT Key**: `game_id`
- **Notes**: Store full response as `boxscore_json`

#### `nba.ngss_pbp`
- **Endpoint**: NGSS `GET /games/{gameId}/playbyplay`
- **UPSERT Key**: `game_id`
- **Notes**: Richer than NBA PBP for challenges, officials attribution

#### `nba.ngss_officials`
- **Endpoint**: NGSS `GET /Games/{gameId}/officials`
- **UPSERT Key**: `(game_id, ngss_official_id)`

#### `nba.ngss_rosters`
- **Endpoint**: NGSS `GET /Games/{gameId}/rosters`
- **UPSERT Key**: `(ngss_game_id, ngss_person_id)`
- **Notes**: Use to map `ngss_person_id` → `nba_id`

---

### Phase 5: Aggregated Stats

#### `nba.player_stats_aggregated`
- **Endpoint**: `GET /api/stats/player?leagueId=00&season=2024-25&seasonType=Regular%20Season&perMode=PerGame&measureType=Base`
- **Params**: Iterate over `perMode` × `measureType` × `seasonType`
- **UPSERT Key**: `(nba_id, team_id, season_year, season_type, per_mode, measure_type)`
- **Notes**: 
  - `team_id=0` for season-long totals (multi-team players)
  - Fetch for each: `perMode` in [Totals, PerGame, Per36, Per100Possessions]
  - Fetch for each: `measureType` in [Base, Advanced, Misc, Scoring]

#### `nba.team_stats_aggregated`
- **Endpoint**: `GET /api/stats/team?leagueId=00&season=2024-25&seasonType=Regular%20Season&perMode=PerGame&measureType=Base`
- **UPSERT Key**: `(team_id, season_year, season_type, per_mode, measure_type)`

#### `nba.lineup_stats_season` / `nba.lineup_stats_game`
- **Endpoint**: `GET /api/stats/rosterlineup`
- **Notes**: TBD — need to verify exact params

---

### Phase 6: Supplemental

#### `nba.injuries`
- **Endpoint**: `GET /api/stats/injury?leagueId=00`
- **Frequency**: Multiple times per day (before games)
- **UPSERT Key**: `(nba_id, team_id)`
- **Notes**: Overwrites on each fetch (current injuries only)

#### `nba.alerts`
- **Endpoint**: `GET /api/alerts/topNAlerts?gameId=0022400123&alertCount=10`
- **UPSERT Key**: `alert_id`

#### `nba.pregame_storylines`
- **Endpoint**: `GET /api/alerts/topNPregameStorylines?gameId=0022400123&storylineCount=5`
- **UPSERT Key**: `(game_id, team_id, storyline_order)`

#### `nba.tracking_streams`
- **Endpoint**: `GET /api/tracking/game_streams`
- **UPSERT Key**: `stream_id`

---

## Common Transformations

### ISO Duration → Interval
```sql
-- Input: "PT34M12.00S" → interval '34 minutes 12 seconds'
-- Use regex or library to parse
```

### Boolean Conversion
```sql
-- API returns "1"/"0" or 1/0
-- Convert to true/false
```

### Percentage Formatting
```sql
-- API may return 0.456 or 45.6
-- Normalize to decimal (0.456) for storage as numeric(5,4)
```

### Calculated Fields
```sql
-- Always compute:
fg2m = fgm - fg3m
fg2a = fga - fg3a
fg2_pct = CASE WHEN fg2a > 0 THEN fg2m::numeric / fg2a ELSE NULL END
```

---

## Backfill Strategy

### Historical Seasons
1. Get season list from `/api/schedule/seasoncalendar`
2. For each season:
   - Fetch full schedule → extract all `game_id`s
   - Batch fetch games by date or ID list
   - Fetch boxscores, PBP, hustle for each game

### Recommended Batch Sizes
- Games per request: 1 (API limitation)
- Concurrent requests: 5–10 (respect rate limits)
- Sleep between batches: 100–200ms

---

## Live Game Polling

For real-time updates during games:

| Data | Endpoint | Poll Interval |
|------|----------|---------------|
| Score/Status | `/api/scores/scoreboard/date` | 30s |
| Boxscore | `/api/stats/boxscore` | 60s |
| PBP | `/api/stats/pbp` | 30s |
| Alerts | `/api/alerts/topNAlerts` | 60s |

**Notes**:
- Advanced boxscore only available after game final
- Hustle stats only available after game final
- Tracking data may have 24h+ delay

---

## Implementation Checklist

- [ ] Set up API client with retry logic and rate limiting
- [ ] Create migration scripts from `nba/schema/*.txt` specs
- [ ] Build importer for Phase 1 (teams, players)
- [ ] Build importer for Phase 2 (schedules, standings)
- [ ] Build importer for Phase 3 (games)
- [ ] Build importer for Phase 4 (boxscores, PBP, hustle, tracking)
- [ ] Build importer for Phase 5 (aggregated stats)
- [ ] Build importer for Phase 6 (injuries, alerts)
- [ ] Add NGSS importers for supplemental tables
- [ ] Set up cron jobs for daily/live updates
- [ ] Add monitoring for failed fetches and stale data
