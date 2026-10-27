#!/usr/bin/env bash
set -euo pipefail

# Resolve paths from backend even when invoked from the repository root.
cd "$(dirname "${BASH_SOURCE[0]}")"
export DJANGO_SETTINGS_MODULE=config.settings.prod

pip install -r requirements/prod.txt
python manage.py collectstatic --noinput --settings=config.settings.prod
python manage.py migrate --settings=config.settings.prod
python manage.py createcachetable --settings=config.settings.prod
python manage.py runscript barangay --settings=config.settings.prod

# The operations script defaults to preview and does not seed production data.
python manage.py runscript seed_realistic_operations --settings=config.settings.prod
