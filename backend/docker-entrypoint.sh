#!/bin/bash

# Wait for postgres
echo "Waiting for postgres..."
while ! nc -z postgres 5432; do
    sleep 0.1
done
echo "PostgreSQL started"

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Start server
if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.development" ]; then
    python manage.py runserver 0.0.0.0:8000
else
    daphne -b 0.0.0.0 -p 8000 config.asgi:application
fi