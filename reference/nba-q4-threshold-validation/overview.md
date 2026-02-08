# Q4 _Closeout_ Thresholds

> Does the NBA _Closeout_ table hold in post-COVID regular season games?

**Data:** 2,987 close games (final margin ≤ 10), season ≥ 2021.

---

## 1. How the Table Holds Up

Win rates at each threshold, measured at the table's closeout time:

| Lead | _Closeout_ | Games | Wins | Losses | Win% |
|---:|:---:|---:|---:|---:|---:|
| 4 | 00:01 | 1,834 | 1,830 | 4 | **99.8%** |
| 5 | 00:04 | 1,592 | 1,591 | 1 | **99.9%** |
| 6 | 00:09 | 1,381 | 1,381 | 0 | **100.0%** |
| 7 | 00:16 | 1,123 | 1,123 | 0 | **100.0%** |
| 8 | 00:25 | 874 | 874 | 0 | **100.0%** |
| 9 | 00:36 | ~600 | ~599 | 1 | **99.8%** |
| 10 | 00:49 | 368 | 368 | 0 | **100.0%** |

**Bottom line:** The "worst" threshold (lead ≥ 4 at 00:01) wins 99.78% of the time. The handful of losses come from 1,800+ game samples.

---

## 2. First-Loss Analysis

The "first loss" is the earliest time remaining where a team with lead ≥ L actually lost. This tells us where the table breaks down.

| Lead | _Table Says_ | First Loss | Empirical 100% | Verdict |
|---:|:---:|:---:|:---:|:---|
| 4 | 00:01 | 00:03 | 00:02 | ✓ Table is safe |
| 5 | 00:04 | 00:04 | 00:03 | ⚠️ Borderline (1s late) |
| 6 | 00:09 | 00:10 | 00:09 | ✓ Exact match |
| 7 | 00:16 | 00:19 | 00:18 | ✓ Table is safe |
| 8 | 00:25 | 00:27 | 00:26 | ✓ Table is safe |
| 9 | 00:36 | 00:27 | 00:26 | ⚠️ 9s too late |
| 10 | 00:49 | 02:03 | 02:02 | ✓ Very conservative |

---

## 3. Key Findings

1. **The table is mostly correct.**
    - 5 of 7 thresholds are safe or exact.
    - The exceptions are rare: 4 distinct losses from 1,834 games at lead ≥ 4.

2. **Lead = 5 at 00:04 is borderline.**
    - First loss exactly at 00:04. But 1,592 games with only 1 loss = 99.94%.

3. **Lead = 6 at 00:09 is correct.**
    - 1,381 games, 0 losses. First loss at 00:10.

4. **Lead = 9 at 00:36 is slightly too late.**
    - First loss at 00:27. But even at 00:36, win rate is still ~99.8%.

5. **Lead = 10 at 00:49 is very conservative.** First loss doesn't appear until 02:03 remaining.
