# Fictional Sariaya hog histories

The generator produces simulation data for demonstrations, never verified municipal
counts or an estimate of actual ASF mortality. The checked in CSV is an existing
artifact. Implementing or previewing the generator does not replace that artifact
or import anything into your database.

## Commands

Run from `backend/` with its virtual environment active. Both scripts default to
preview. The exporter reads barangays but never writes survey records to PostgreSQL.
Generation requires all 43 recognized Sariaya barangays already present in that
database. An empty or incomplete barangay table causes a validation error; the
generator does not populate or repair it automatically.

```powershell
python manage.py runscript generate_data --script-args as-of=2026-10-27 seed=42
python manage.py runscript generate_data --script-args as-of=2026-10-27 seed=42 mode=apply
python manage.py runscript hog_survey
```

The second command writes `datasets/naturalized_hog_survey.csv`. You can choose
another file using `output=...`. The importer defaults to the same path. Only an
explicit importer `mode=apply` writes surveys. The existing `replace` option is
destructive and remains opt in. No operational reseed is needed for this workflow.

The report includes monthly opening stock, births, purchases, eligible finishers,
sales, deaths (including simulated outbreak losses), closing stock, capacity, and
numbers of paused and disrupted farms. Monthly flows stop at the latest saved
quarter. They are diagnostics, not extra survey rows or transport permit records.
The operations seeder preview reports the same flows and does not write data.

## Simulation assumptions

`apps/maps/herd_simulation.py` defines the immutable `SimulationConfig` defaults.
You can pass a different config to `generate_history`; the public
`generate_surveys(barangays, as_of=None, seed=42)` signature remains unchanged.
There are no model, migration, CSV column, or HTTP interface changes.

* History starts with established herds on December 31, 2019. Quarterly snapshots
  start March 31, 2020, and include quarter ends on or before `as_of`. The default
  date uses Asia/Manila. Partial quarters are omitted.
* Initial capacity is 22,000 head. The existing 43 barangay weights are retained
  proportionately (their raw sum is 19,165). The three zero weight barangays stay
  zero. Eight farm capacity weights remain 0.9, 1.6, 2.8, 4.2, 1.3, 2.0, 0.7, 1.1.
  Allocation occurs once at initialization, never to force a later census total.
* Each farm has its own seeded random stream. Sorting canonical barangay names
  preserves the existing synthetic farmer names and contacts. Input ordering and
  extending the end date cannot change previously generated records or reports.
  Zero stock farms still have quarterly observations.
* Three of eight farm slots finish purchased stock without breeding females.
  Breeding farms target sows at 5.5 to 8.5 percent of capacity. Initial sow schedules
  span pregnancy and recovery. A 65 percent artificial insemination probability
  permits breeding farms without boars; other farms with at least two sows start
  with a boar. This is a breeding access assumption, not a measured local rate.
* Pregnancy takes four monthly steps. Litters contain 8 to 12 liveborn piglets.
  A sow waits two months for nursing and recovery before another attempt.
  Farm fertility ranges from 72 to 94 percent per eligible monthly attempt.
* Market pigs aged 0 and 1 months are `starter`, 2 and 3 are `grower`, and 4 or
  older are `fattener`. Farms sell only after their own market age, 4, 5, or 6
  months. Replacement females retained at age 4 are `bulaw` (Dumalaga), then
  enter `inahin` at age 8 and begin a full pregnancy before producing a litter.
* Starter survival across two monthly transitions is 90 to 98 percent per farm.
  Other monthly mortality is 0.1 to 0.5 percent. Initial animals have varied ages.
* Eligible monthly sales probability is a farm rate of 28 to 52 percent, multiplied
  by `1 + (monthly demand multiplier - 1) * market participation`, with 4 percent
  monthly variation and clipping to [0, 1]. Farm market participation ranges from
  0.4 to 1.2. Increased demand affects eligible sales and can lower standing stock.
* Demand multipliers from January to December are 0.90, 1, 1, 1, 1.15, 1, 1, 1,
  1.10, 1, 1.10, 1.35. May and September increases are assumptions around Agawan
  and the town fiesta. These values are not measured consumption changes.
* Farms anticipate demand when attempting conception, looking ahead by gestation
  plus their market age, and when purchasing, looking ahead from age 2 to market
  age. Purchases fill vacant capacity in batches of 15 to 30 percent of capacity,
  at farm intervals of 1 to 3 months. Anticipated demand can raise the purchase
  target by `25 percent * (future multiplier - 1) * participation`. Breeding farms
  can instead buy five month old replacement gilts to restore missing breeders.
  Purchases are external inflows, not transfers between simulated farms.
* Capacity multipliers are linearly interpolated monthly through these anchors:
  2020 Q1 1.00, 2020 Q4 0.50, 2021 Q4 0.38, 2022 Q4 0.45, 2023 Q4 0.63,
  2024 Q2 0.70, 2024 Q4 0.49, 2025 Q4 0.55, 2026 Q3 0.60. The last value is
  held for future months. Capacity controls purchases and breeding decisions.
  Animals are never removed or multiplied merely to match an anchor. Existing
  pregnancies can finish even while capacity declines or a farm pauses breeding.
  A smaller sow target leaves some existing sows idle while other sows continue
  breeding within that target.
* During April to December 2020, 80 percent of farms receive one independently
  timed loss event with a 35 to 75 percent loss probability per animal and a
  3 to 9 month breeding and purchase pause. During July to December 2024, the
  corresponding assumptions are 65 percent of farms, 25 to 60 percent losses,
  and 3 to 8 months paused. Restocking waits a further farm purchase interval.
  The 2022 recovery is represented by rising capacity and delayed restocking,
  maturation, conception, and births, without injecting immediate replacement herds.
* Every farm month balances: closing = opening + births + purchases - sales -
  deaths. Aging and category changes preserve headcount. Capacity is a management
  target, so births and previously scheduled pregnancies can exceed it temporarily.

## Sources and their limits

The [DA BAFS organic swine manual, page 27](https://bafs.da.gov.ph/wp-content/uploads/2025/05/2025_EM-Organic-Swine_compressed.pdf)
identifies a 114 day gestation period. Four monthly steps approximate that biology.
Litter sizes, survival, age categories, and every rate above are simulation choices.

The [DA December 6, 2025 press clippings, pages 25 and 26](https://www.da.gov.ph/wp-content/uploads/2025/12/Clippings-for-December-6-2025.pdf)
report the DA secretary describing increased Christmas demand for pork. The
simulation's 1.35 multiplier is an assumption, not a statistic from the statement.

The supplied [Agawan proclamation](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/7/97360)
is the plan's May 15 festival reference. The court page could not be retrieved
during implementation. The [municipal tourism listings](https://www.sariaya.gov.ph/category/tourism/)
place the town fiesta in September. Festival dates do not establish pork volumes.

The [DA CALABARZON September 2020 intervention report](https://calabarzon.da.gov.ph/quezon-farmers-affected-by-asf-receive-livelihood-intervention-from-da/)
documents support for ASF affected Sariaya farmers. The
[DA January 2022 recovery statement](https://www.da.gov.ph/pork-supply-stabilizes-as-da-continues-to-pursue-strategies-against-asf/)
describes national recovery programs. The
[DA September 2024 controlled testing statement](https://www.da.gov.ph/da-chief-wants-wider-coverage-of-asf-vaccine-controlled-testing/)
includes Quezon in expanded vaccine testing. These motivate disruption and
recovery periods; neither the capacity anchors nor farm event magnitudes are
measured local losses or a fit to official population records.

## Targeted verification

```powershell
python -m pytest apps/maps/tests/test_survey_generation.py apps/maps/tests/test_hog_survey_upload.py -q
```

Import integration tests use the configured PostgreSQL test database. Simulation
unit tests use unsaved model instances and do not require database access. No full
suite or real database reseed is part of this check.

The existing upload file has five failing assertions that perform exact SQL
lookups on randomly encrypted farmer names. These also fail with the original
generator. The new round trip test compares decrypted model values instead.
