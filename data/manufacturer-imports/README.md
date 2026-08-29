# Manufacturer ingestion inputs

These CSV files are snapshots of the cleaned digestion sheets in Google Drive at `line/plants/`. They are the importer inputs for the first directory-growth milestone. Do not replace them with `data/copackers.csv` or the older candidate list.

Run the pipeline with:

```sh
npm run manufacturers:dry-run
npm run manufacturers:import
npm run manufacturers:check
```

The importer:

1. validates every row with Zod;
2. admits only `VERIFIED` and `LISTABLE` records;
3. normalizes product, process, packaging, operation, and certification fields without runtime AI;
4. deduplicates first by `master_dedupe_key`, then checks name, domain, phone, email, and city/state identity signals;
5. excludes matches already represented in the hand-curated catalog;
6. keeps stronger hand-curated records when a cleaned row resolves to the same company;
7. imports the complete deduplicated `VERIFIED` and `LISTABLE` pool;
8. reports new, updated, unchanged, duplicate, skipped, and invalid records before writes;
9. writes `lib/directory/imported-plants.generated.ts` and `import-report.generated.json` only with `--apply`.

Blank source fields remain blank and render as not publicly listed. `LISTABLE` records retain a quieter public-source label and never receive the Verified badge.

The 2026-08-25 expansion added official-site-reviewed records that fill beverage, water, dry-powder, fermented, and refrigerated-food gaps. A candidate stays out when its current official site does not clearly offer outside manufacturing work.

The no-argument command and `manufacturers:dry-run` are read-only. Run the dry run first, inspect its counts and Batch 26 dispositions, then apply and run the check. Re-running the same inputs is idempotent.

To add a future batch, place its cleaned CSV in this directory and rerun the three commands. Review the generated report and diff before shipping.
