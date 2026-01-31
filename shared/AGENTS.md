# AGENTS.md — `shared/`

This directory is **scratch space** for local/dev extracts and for Windmill flow step handoff.

It is **not** meant to be committed to git (large extracts live here). The only tracked file should be this `AGENTS.md`.

---

## Why it exists

Windmill flows in this repo set `same_worker: true`, which means each step can read/write the same `./shared/` directory.

Typical usage:
- `import_pcms_data.flow/pcms_xml_to_json.inline_script.py` writes clean JSON to `shared/pcms/...`
- later PCMS steps read that JSON
- `import_sr_data.flow/` may also write temporary fetch artifacts

---

## Structure (typical)

- `shared/pcms/`
  - `nba_pcms_full_extract_xml/` — raw XML files (local convenience)
  - `nba_pcms_full_extract/` — clean JSON outputs used by import scripts

- `shared/sr/`
  - scratch data / caches for SportRadar runs (optional)

You may also see `.shared/` used by older/local scripts — both `shared/` and `.shared/` are gitignored.

---

## Safe operations

- It’s generally safe to `rm -rf shared/pcms/*` and regenerate.
- Step A of the PCMS Windmill flow **deletes `./shared/pcms/`** before extracting.

If a local import fails because JSON is missing, regenerate it first:

```bash
uv run scripts/xml-to-json.py \
  --xml-dir shared/pcms/nba_pcms_full_extract_xml \
  --out-dir shared/pcms/nba_pcms_full_extract
```
