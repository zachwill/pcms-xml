# Roster Fill Logic (12/14) + Proration + “+14 Days to Sign”

**Status:** Draft (recon captured)  
**Date:** 2026-02-03

This memo documents Sean’s workbook conventions around:

- **Fill to 12** roster slots (“Rookie Mins”)
- **Fill to 14** roster slots (“Vet Mins”)
- **Proration** of those fills based on days remaining in the regular season
- The extra **“+14 days to sign”** nuance used in **The Matrix** for trade scenarios

> Why this matters: multiple sheets implement similar-looking “fill” rows, but with slightly different assumptions about *when* the signings occur.

---

## 1. Minimum sources (what to use in Postgres)

### Rookie minimum
- Sean concept: “Rookie Min” (Year 1)
- Postgres: `pcms.league_salary_scales.minimum_salary_amount`
- Key: `league_lk='NBA' AND years_of_service=0 AND salary_year=<year>`

### Veteran minimum (Sean’s “Vet Min”)
- Sean concept: “Vet Min” (Year 1)
- Postgres: `pcms.league_salary_scales.minimum_salary_amount`
- Key: `league_lk='NBA' AND years_of_service=2 AND salary_year=<year>`

Example (2025):
- rookie min = 1,272,870
- vet min (YOS=2) = 2,296,274

---

## 2. Regular-season calendar (what to use in Postgres)

For `/174` style proration, the relevant calendar is the *regular season*, not the July 1 league year.

Use:
- `pcms.league_system_values.days_in_season` (NBA = 174)
- `pcms.league_system_values.playing_start_at`
- `pcms.league_system_values.playing_end_at`

---

## 3. “Immediate” fill logic (Playground / Team / Team Summary)

Across `playground.json`, `team.json`, `team_summary.json`, Sean’s basic pattern is:

- If roster < **12** → add missing slots × **rookie min**
- If roster < **14** → add missing slots × **vet min**
- Multiply by **days_remaining / 174**

### Evidence: Team Summary
From `reference/warehouse/specs/team_summary.md`:

```excel
Rookie fill (to 12):
=IF(C3<12,12-C3,0)*rookie_min*(days_left/174)

Vet fill (to 14):
=IF(C3<14,14-C3,0)*vet_min*(days_left/174)
```

### Interpretation
This is modeling the “cost” of being short-handed as of the **as-of date**.

---

## 4. The Matrix “+14 days to sign” nuance (trade scenarios)

**The Matrix** adds a second layer of realism for trade deadline / multi-team trade work:

- It computes a **sign date** as `trade_date + 14`
- It prorates the minimums as if those minimum signings occur on that later date

Evidence (from `reference/warehouse/the_matrix.json`):
- `AI5` = trade date
- `AI9 = AI5 + 14` (“Day to Sign (+14)”) 
- `AI10` = day-of-season derived from `AI9 - AI4`
- `AI12` = vet min prorated from `AI10`

### Interpretation
This is effectively a built-in assumption:

- you may be under 14 for up to ~2 weeks
- the “fill to 14” minimums should be priced as if they are signed at the end of that window

---

## 5. Tooling implications / UI inputs (future work)

If we want parity + flexibility, the UI likely needs:

- **As-of date** (already exists in META)
- **Event date** (trade/transaction date)
- **Sign delay days** (default 14 for trade scenarios; 0 for “immediate”) 
- **Fill-to-12 basis**: rookie min vs vet min (scenario assumption)
- **Fill-to-14 basis**: default vet min, but configurable

This likely belongs in the Playgound left-rail **SIGN** section (or an expanded “SIGN / ROSTER FILL” sidebar block) with validation.
