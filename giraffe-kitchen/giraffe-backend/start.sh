#!/bin/bash
set -e  # Exit on error

echo "Starting deployment..."

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Seed initial data if needed (don't fail if already seeded)
echo "Seeding initial data..."
python seed_data.py || echo "⚠️  Seeding skipped (data may already exist)"

# Start the application
echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
