# Add Missing Import Scripts

Reference: `TODO.md` for data mappings, `import_pcms_data.flow/players_&_people.inline_script.ts` for pattern.

## TODO
- [ ] Create `agents_&_agencies.inline_script.ts` (step m) — agencies from `lookups.json`, agents from `players.json` filtered by `person_type_lk == "AGENT"`
- [ ] Create `transaction_waiver_amounts.inline_script.ts` (step n) — from `transaction_waiver_amounts.json`
- [ ] Create `league_salary_scales_&_projections.inline_script.ts` (step o) — from `yearly_salary_scales.json` + `cap_projections.json`
- [ ] Create `two_way_utility.inline_script.ts` (step p) — from `two_way_utility.json` for `two_way_game_utility` + `team_two_way_capacity`
