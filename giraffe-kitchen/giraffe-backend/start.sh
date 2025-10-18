#!/bin/bash

# Run database migrations
echo "Running database setup..."
python -c "from app.db.base import Base, engine; Base.metadata.create_all(bind=engine)"

# Seed initial data
echo "Seeding initial data..."
python seed_data.py

# Start the application
echo "Starting application..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
