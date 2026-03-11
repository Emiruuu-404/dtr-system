#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Load existing data from local database (runs only if datadump.json exists)
if [ -f "datadump.json" ]; then
    python manage.py loaddata datadump.json
    echo "Data loaded successfully!"
fi
