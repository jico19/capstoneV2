# Backend tests

Run commands from `backend/` with `venv` active. Tests use PostgreSQL configured
by `backend/.env` through `config.settings.base`. Database tests run against
pytest-django's separate test database, not the application's database.

## Layout

Keep application tests in `apps/<app>/tests/test_<behavior>.py`. Every test
directory is a Python package so Django and pytest can discover it consistently.
Keep tests for scripts that coordinate several apps in `tests/scripts/`.
`pytest.ini` discovers both locations.

| Location | Coverage |
| --- | --- |
| `apps/api/tests/` | Registration, tokens, KYC, profile permissions, notifications, privacy, secure media, user query counts |
| `apps/dashboard/tests/` | Analytics, insights, role permissions, cache behavior |
| `apps/documents/tests/` | Generated permit and MAO PDFs, document signatories |
| `apps/inspector/tests/` | Permit verification and inspection logs |
| `apps/maps/tests/` | Survey APIs, census aggregation, CSV uploads, farmer lookup, herd simulation, generated survey history |
| `apps/ocr/tests/` | Document extraction and validation, OCR providers, manual review and fallback |
| `apps/payment/tests/` | Offline confirmation, staff simulation, payment services, security, expiration |
| `apps/permits/tests/` | Application documents, OCR corrections, workflow, permissions, reports, signatories, numbering, application query counts |
| `apps/sms/tests/` | Task messages, opt out, deduplication, retries, gateway rate limits |
| `tests/scripts/` | Operations and account seeding, rollback, repeat execution, production guards |

Fixtures shared within an app belong in that app's `tests/conftest.py`.
Fixtures specific to a test module stay in that module. Avoid importing fixtures
from another test module or sharing unrelated fixtures across apps.

## Targeted commands

```powershell
# Check discovery without executing tests or creating a test database.
python -m pytest --collect-only -q

# Run only the area you changed.
python -m pytest apps/payment/tests/test_offline_payment.py -q
python -m pytest apps/permits/tests/test_numbers.py -q
python -m pytest apps/sms/tests -q
python -m pytest tests/scripts/test_seed_accounts.py -q

# Run a workflow or just the simulation logic.
python -m pytest apps/permits/tests/test_workflow.py::TestPermitWorkflow::test_full_workflow -q
python -m pytest apps/maps/tests/test_herd_simulation.py -q
```

Run the full suite only when explicitly requested, as required by root
`AGENTS.md`. Keep security, authorization, rollback, and edge case tests even
when a larger workflow also exercises the same endpoint. Query count tests
protect against extra database queries as list sizes grow.

## Cleanup decisions

* Split `payment/tests/test_legacy.py` into offline payment and staff simulation
  modules. Move AIC numbering and the MAO number sequence test into
  `permits/tests/test_numbers.py`.
* Combine repeated successful payment requests into one success case per
  endpoint, preserving the release, paid state, payment method, AIC number,
  and audit assertions. Keep the separate service and endpoint tests because
  they exercise different boundaries.
* Remove the AIC preservation test that implemented its own guard instead of
  invoking production code, the duplicate staff simulation production guard,
  and the checkout case labeled as a wrong status test that only repeated the
  already paid setup and assertion.
* Remove `api/tests/test_demo_seed.py`, which targeted a replaced seeder with
  `ACCOUNTS`, `OPERATIONAL_MODELS`, a fixed 100-record dataset, Cloudinary upload
  helpers, and `FARMPASS_DEMO_SEED_ENABLED`. The current script uses a different
  implementation and `FARMPASS_SEED_ENABLED`. Retain its current operations
  and account tests under `tests/scripts/`.
* Remove calls to the absent `scripts.generate_data` exporter from census and
  history tests. Retain generated data, CSV importer preview, import round trip,
  repeated import, census API, and API CSV export assertions. Construct the
  import fixture CSV from generator records in the test.
* Separate herd lifecycle tests from survey generation and CSV integration
  tests. Split SMS task and service tests, and give query count modules
  descriptive names.
