# Manufacturer ingestion inputs

These CSV files are snapshots of the cleaned digestion sheets in Google Drive at `line/plants/`. They are the importer inputs for the first directory-growth milestone. Do not replace them with `data/copackers.csv` or the older candidate list.

Run the pipeline with:

```sh
npm run manufacturers:import
npm run manufacturers:check
```

The importer:

1. validates every row with Zod;
2. admits only `VERIFIED` and `LISTABLE` records;
3. normalizes product, process, packaging, operation, and certification fields without runtime AI;
4. deduplicates first by `master_dedupe_key`, then checks name, domain, phone, email, and city/state identity signals;
5. excludes matches already represented in the hand-curated catalog;
6. ranks a deterministic initial 50-record cohort;
7. writes `lib/directory/imported-plants.generated.ts` and `import-report.generated.json`.

Blank source fields remain blank and render as not publicly listed. `LISTABLE` records retain a quieter public-source label and never receive the Verified badge.

To add a future batch, place its cleaned CSV in this directory and rerun both commands. Review the generated report and diff before shipping.
