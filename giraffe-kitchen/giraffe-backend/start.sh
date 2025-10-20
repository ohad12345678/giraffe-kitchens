#!/bin/bash

# Run database migrations
alembic upgrade head

# Seed initial data if needed
python seed_data.py

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
