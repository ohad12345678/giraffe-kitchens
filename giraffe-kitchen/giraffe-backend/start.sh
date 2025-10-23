#!/bin/bash

echo "Starting deployment..."

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
