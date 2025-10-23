#!/bin/bash

echo "Starting deployment..."

# Check if forced database recreation is requested
if [ "$FORCE_RECREATE_DB" = "true" ]; then
    echo "🗑️  FORCE_RECREATE_DB=true detected - deleting database..."
    rm -f /data/giraffe_kitchens.db /data/giraffe_kitchens.db-shm /data/giraffe_kitchens.db-wal
    echo "✅ Database deleted! Will recreate with correct schema..."
fi

# Run database migrations (don't fail on error)
echo "Running database migrations..."
alembic upgrade head || echo "⚠️  Migration failed or already up to date"

# Seed initial data if needed (don't fail if already seeded)
echo "Seeding initial data..."
python seed_data.py || echo "⚠️  Seeding skipped (data may already exist)"

# Start the application
echo "PORT environment variable: ${PORT}"
echo "Starting application on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info --proxy-headers --forwarded-allow-ips='*'
