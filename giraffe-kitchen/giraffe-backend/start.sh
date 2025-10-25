#!/bin/bash

echo "Starting deployment..."

# Run database migrations (don't fail on error)
echo "Running database migrations..."
# If migration fails due to duplicate columns, stamp to latest and continue
if ! alembic upgrade head 2>&1; then
    echo "⚠️  Migration failed, attempting to stamp current version..."
    alembic stamp head || echo "⚠️  Could not stamp, continuing anyway..."
fi

# Force create missing tables (for manager_evaluations)
echo "Ensuring all tables exist..."
python -c "
from app.db.base import Base, engine
from app.models import ManagerEvaluation, ManagerEvaluationCategory
Base.metadata.create_all(bind=engine)
print('✅ Tables created/verified')
" || echo "⚠️  Table creation skipped"

# Seed initial data if needed (don't fail if already seeded)
echo "Seeding initial data..."
python seed_data.py || echo "⚠️  Seeding skipped (data may already exist)"

# Start the application
echo "PORT environment variable: ${PORT}"
echo "Starting application on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info --proxy-headers --forwarded-allow-ips='*'
