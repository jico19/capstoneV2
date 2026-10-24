# backend/apps/dashboard

## Overview

Executive dashboard and AI insights backend for the Municipal Agriculture Office (MAO). Owns dashboard data endpoints, KPI counters, and the Gemini powered insight engine.

## Key files

| File | Owns |
|---|---|
| `views.py` | Dashboard viewsets, role gated access (`RoleAllowed`), farmer dashboard scoped to `request.user` |
| `insights_engine.py` | Gemini 2.5 Flash insight generation with deterministic fallback |
| `services.py` | Dashboard service logic and caching |
| `serializers.py` | Dashboard serializers |
| `models.py` | Dashboard related models |
| `urls.py` | Dashboard route includes |

## Commands

Same as root (run from `backend/`): run `python manage.py runserver 8000`, tests via targeted `python -m pytest apps/dashboard/tests/<test_file>.py`.

## Conventions

- All dashboard endpoints are role gated via `RoleAllowed`; farmer scoped to `request.user`.

## Gotchas

- AI insight generation reads `GEMINI_API_KEY` / `GEMINI_MODEL` from settings and falls back to deterministic insights when the API is not configured or fails.

## Related specs

None yet.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
