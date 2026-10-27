# Hog survey census and generation

The generated farmer profiles, contacts, herd sizes, and barangay rankings are fictional assumptions for demonstrations and testing. They are not verified MAO statistics. The reference CSV files remain unchanged. The application uses its ordinary census labels.

## Census rules

One observation represents one raiser's herd on the supplied survey date. Within a calendar quarter, the latest observation for each normalized farmer name and barangay replaces earlier observations. Names are compared without case, extra whitespace, or accents. Contacts do not define identity. An exact date tie uses the row with the larger database ID. Two different people with the same normalized name in the same barangay cannot be distinguished by the existing model.

The six categories, `inahin`, `barako`, `fattener`, `grower`, `bulaw`, and `starter`, define the total. Historical observations remain available in survey lists and CSV exports. Legacy unnamed observations remain separate in census calculations because their raiser identity is unknown. For imports, an unnamed record matches other unnamed records in the same barangay on the same date. Add farmer names to reference CSVs before using them as individual raiser histories.

The current population is the latest municipal census quarter, with no carry forward from older quarters. A missing barangay returns `total_pigs: null`, `density_level: "No data"`, and `has_observations: false`. An observed zero returns `0`, `"None"`, and `true`. `census_date` is the quarter end, while `survey_date` is the latest actual observation date. Coverage reports observed barangays out of the authorized barangays. No population count establishes disease presence or risk.

Map month, range, season, and year filters select the latest quarter represented in the requested calendar window. The census then includes all observations in that quarter. A range never adds multiple quarterly populations together. `compare_year` selects the latest quarter represented in both years after applying calendar filters. No shared quarter produces missing data. The frontend passes reciprocal comparison years and compares only barangays observed in both periods.

The map, municipal dashboard, barangay insights, and `GET /hog-survey/census_history/` share these rules. History returns quarterly totals, category breakdowns, raiser counts, and coverage, with gaps for barangays without observations in a municipal census quarter. Staff roles are Admin, Agri, and assigned Barangay. Barangay staff receive only their barangay's totals and history. Raw survey lists and exports preserve all observations.

## Generation assumptions

`backend/apps/maps/survey_generation.py` contains the explicit targets for all 43 barangays. These targets deliberately exercise the existing thresholds: None = 0, Low = 1 to 99, Medium = 100 to 499, High = 500 to 1499, Very High = 1500 or more.

Lutucan 1 (2,100) and Lutucan Malabag (1,900) have the highest assumed targets. Lutucan Bata, Guisguis, Manggalang 1 and Bantilan, Concepcion Banahaw and Pinagbakuran, Bignay, and Janagdong 1 are assigned High targets. Barangays 4, 5, and 6 have observed zero targets. Barangays 1 to 3, Castañas, Talaan, and Tumbaga have Low targets. Remaining barangays have Medium targets. These rankings are scenario choices, not claims about local farms.

Each barangay has eight stable fictional profiles with distinct contact numbers. Seven report initially. Profile seven starts in Q2 2023, and profile eight stops reporting from Q4 2024. Their identities and dates do not change when you extend the reference date. Herd allocations use unequal weights, mixed operations and operations with no breeding stock, gentle growth or decline, and a different seasonal phase and direction for each barangay. Integer remainder allocation makes category sums exact. Zero target barangays still report zero observations.

Generation starts at Q1 2022 and ends at the last quarter end strictly before the reference date. The default reference date is today in Asia/Manila. The default seed is `42`. The same seed, date, and recognized barangays reproduce the same logical records. Database IDs, upload timestamps, and encrypted ciphertext are not reproducibility inputs.

## Preview and apply

Run from `backend/` using the project virtual environment. The scripts accept simple `key=value` arguments because `runscript` consumes conventional dashed options. Every script defaults to preview.

```powershell
python manage.py runscript seed_realistic_operations --script-args as-of=2026-10-27 seed=42
python manage.py runscript generate_data --script-args as-of=2026-10-27 seed=42
python manage.py runscript hog_survey --script-args ./datasets/naturalized_hog_survey.csv
```

Preview reports valid record counts, date coverage, the sum over raw historical observations, the current census population, current barangay classifications, and validation errors. Historical totals are sums of observations, not current headcounts. A reference date of 2026-10-27 with seed 42 produces 5,977 observations from 2022-03-31 through 2026-09-30, with a current census of 19,124 pigs.

To write a generated CSV or apply validated supplied counts without deleting existing surveys:

```powershell
python manage.py runscript generate_data --script-args mode=apply as-of=2026-10-27 seed=42 output=synthetic_hog_data.csv
python manage.py runscript hog_survey --script-args ./synthetic_hog_data.csv mode=apply
```

CSV dates, names, contacts, and counts are preserved. No seasonal transformations, forced breeding stock, or quarter rounding occur during import. All required category and total cells must contain nonnegative whole numbers. Invalid dates, unknown barangays, conflicting totals, duplicate farmer/date entries, and records outside the importing official's barangay reject the complete import. Existing matching identities and dates are updated, never added to their earlier counts. Existing ambiguous duplicates reject apply so they can be resolved explicitly.

`POST /hog-survey/upload_csv/` also accepts multipart `mode=preview` or `mode=apply` (default apply for existing UI compatibility). Preview returns validation failures without saving. Apply validates the entire file before saving in one transaction.

Replacement requires an explicit `replace` script argument or `replace=true` API field. It deletes existing surveys only after validation, in the same transaction as the import. API replacement is restricted to municipal staff. Preview before any replacement and obtain separate authorization before running a destructive reseed. No replacement was run as part of this implementation.

The operations script shares the same generator and import logic. Its default preview performs no operational writes. `mode=apply` keeps existing surveys and updates matching generated observations. The operations script also creates its existing permit demo records and accounts, so prefer `generate_data` plus `hog_survey` when only surveys are needed. Adding `replace` to the operations script clears its broader operational data within its existing cleanup scope. Do not use that mode merely to update surveys.

Imports, seeding, manual changes, and deletion expire affected saved Agri and Barangay insights and invalidate municipal dashboard metrics after commit. Census endpoints compute fresh totals rather than retaining per filter caches. Bulk writes explicitly call invalidation, since Django bulk operations do not send save signals.

## Targeted verification

```powershell
python -m pytest apps/maps/tests/test_census.py apps/maps/tests/test_survey_data.py apps/maps/tests/test_hog_survey_upload.py apps/maps/tests/test_farmer_lookup.py apps/maps/tests/test_map_crud.py -q -p no:cacheprovider
```

These checks use PostgreSQL and cover generation, exact import validation, rollback after failed replacement, rerun idempotency, classification boundaries, role restrictions, missing versus zero counts, matching quarter comparisons, cached metric refresh, and consistency across the map, municipal dashboard, barangay roster, quarterly history, and raw CSV export. The full backend suite is outside this task's verification scope.
