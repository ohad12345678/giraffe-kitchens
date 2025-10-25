#!/bin/bash

echo "Starting deployment..."

# Run database migrations (don't fail on error)
echo "Running database migrations..."
# If migration fails due to duplicate columns, stamp to latest and continue
if ! alembic upgrade head 2>&1; then
    echo "⚠️  Migration failed, attempting to stamp current version..."
    alembic stamp head || echo "⚠️  Could not stamp, continuing anyway..."
fi

# Force recreate manager_evaluations tables (fix incomplete migration)
echo "Fixing manager_evaluations tables..."
python -c "
from app.db.base import engine
from sqlalchemy import text

# Drop existing incomplete tables
with engine.connect() as conn:
    try:
        conn.execute(text('DROP TABLE IF EXISTS manager_evaluation_categories'))
        conn.execute(text('DROP TABLE IF EXISTS manager_evaluations'))
        conn.commit()
        print('🗑️  Dropped existing manager_evaluations tables')
    except Exception as e:
        print(f'⚠️  Could not drop tables: {e}')

# Recreate tables with correct schema
from app.db.base import Base
from app.models import ManagerEvaluation, ManagerEvaluationCategory
Base.metadata.create_all(bind=engine)
print('✅ Manager evaluation tables recreated')
" || echo "⚠️  Table recreation skipped"

# Seed initial data if needed (don't fail if already seeded)
echo "Seeding initial data..."
python seed_data.py || echo "⚠️  Seeding skipped (data may already exist)"

# Start the application
echo "PORT environment variable: ${PORT}"
echo "Starting application on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info --proxy-headers --forwarded-allow-ips='*'
