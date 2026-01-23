-- 050_endnotes_assertions.sql
-- Assertions for pcms.endnotes table after import

\echo '=== 050: Endnotes assertions ==='

-- 1) Table exists and is not empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pcms.endnotes LIMIT 1) THEN
        RAISE EXCEPTION 'FAIL: pcms.endnotes is empty';
    END IF;
    RAISE NOTICE 'PASS: pcms.endnotes is not empty';
END $$;

-- 2) endnote_id is unique (enforced by PK, but check explicitly)
DO $$
DECLARE
    dup_count int;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT endnote_id) INTO dup_count FROM pcms.endnotes;
    IF dup_count > 0 THEN
        RAISE EXCEPTION 'FAIL: pcms.endnotes has % duplicate endnote_ids', dup_count;
    END IF;
    RAISE NOTICE 'PASS: endnote_id is unique';
END $$;

-- 3) metadata_json->>'source_file' is present for all rows
DO $$
DECLARE
    missing_count int;
BEGIN
    SELECT COUNT(*) INTO missing_count 
    FROM pcms.endnotes 
    WHERE metadata_json->>'source_file' IS NULL;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'FAIL: % rows missing metadata_json.source_file', missing_count;
    END IF;
    RAISE NOTICE 'PASS: all rows have metadata_json.source_file';
END $$;

-- 4) Sanity: expect at least 300 endnotes (we have 323 curated)
DO $$
DECLARE
    cnt int;
BEGIN
    SELECT COUNT(*) INTO cnt FROM pcms.endnotes;
    IF cnt < 300 THEN
        RAISE EXCEPTION 'FAIL: only % endnotes, expected >= 300', cnt;
    END IF;
    RAISE NOTICE 'PASS: % endnotes loaded (>= 300)', cnt;
END $$;

-- 5) Spot check: endnote 65 (Donovan Mitchell trade) should be a swap + conditional
DO $$
DECLARE
    rec RECORD;
BEGIN
    SELECT is_swap, is_conditional INTO rec FROM pcms.endnotes WHERE endnote_id = 65;
    IF rec IS NULL THEN
        RAISE EXCEPTION 'FAIL: endnote 65 not found';
    END IF;
    IF NOT rec.is_swap THEN
        RAISE EXCEPTION 'FAIL: endnote 65 should be is_swap=true';
    END IF;
    IF NOT rec.is_conditional THEN
        RAISE EXCEPTION 'FAIL: endnote 65 should be is_conditional=true';
    END IF;
    RAISE NOTICE 'PASS: endnote 65 fixture correct (swap=%, conditional=%)', rec.is_swap, rec.is_conditional;
END $$;

-- 6) Check endnotes join with draft_picks_warehouse endnote_refs
DO $$
DECLARE
    match_rate numeric;
    total_refs int;
    matched_refs int;
BEGIN
    WITH fragment_refs AS (
        SELECT DISTINCT unnest(endnote_refs) as ref_id
        FROM pcms.draft_picks_warehouse
        WHERE endnote_refs IS NOT NULL AND array_length(endnote_refs, 1) > 0
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE e.endnote_id IS NOT NULL)
    INTO total_refs, matched_refs
    FROM fragment_refs fr
    LEFT JOIN pcms.endnotes e ON e.endnote_id = fr.ref_id;
    
    IF total_refs = 0 THEN
        RAISE NOTICE 'SKIP: no endnote refs in draft_picks_warehouse';
        RETURN;
    END IF;
    
    match_rate := (matched_refs::numeric / total_refs) * 100;
    
    IF match_rate < 90 THEN
        RAISE EXCEPTION 'FAIL: endnote match rate only % pct (% of %)', round(match_rate, 1), matched_refs, total_refs;
    END IF;
    RAISE NOTICE 'PASS: endnote match rate % pct (% of % refs)', round(match_rate, 1), matched_refs, total_refs;
END $$;

\echo '=== 050: Complete ==='
