# NBA Q4 Substitution Thresholds

Empirical validation of the standard late-game closeout table against post-COVID NBA regular season data.

## The Closeout Table

| Lead | Closeout Time |
|---:|---:|
| 4 | 00:01 |
| 5 | 00:04 |
| 6 | 00:09 |
| 7 | 00:16 |
| 8 | 00:25 |
| 9 | 00:36 |
| 10 | 00:49 |

## Verdict (with sample sizes)

| Lead | Table | First Loss | 100% Safe | Games (≥L) | Losses | Win% | Status |
|---:|---:|---:|---:|---:|---:|---:|:---|
| 4 | 00:01 | 00:03 | 00:02 | 1,834 | 4 | 99.78% | ✓ Safe |
| 5 | 00:04 | 00:04 | 00:03 | 1,592 | 1 | 99.94% | ⚠️ Borderline |
| 6 | 00:09 | 00:10 | 00:09 | 1,381 | 0 | 100.00% | ✓ Exact |
| 7 | 00:16 | 00:19 | 00:18 | 1,123 | 0 | 100.00% | ✓ Safe |
| 8 | 00:25 | 00:27 | 00:26 | 874 | 0 | 100.00% | ✓ Safe |
| 9 | 00:36 | 00:27 | 00:26 | ~600 | 1 | ~99.8% | ⚠️ Slightly late |
| 10 | 00:49 | 02:03 | 02:02 | 368 | 0 | 100.00% | ✓ Very conservative |

_Sample sizes from close games (final margin ≤ 10), season ≥ 2021. "First Loss" = earliest time where lead ≥ L lost._

## Documents

| Document | Description |
|---|---|
| [**overview.md**](overview.md) | One-sheet quick reference with sample sizes |
| [**research.md**](research.md) | Full methodology, data tables, edge cases, worked examples |

## Reproducibility

```bash
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 \
  -f reference/nba-q4-threshold-validation/sql/q4_threshold_sweep_4_10.sql
```
