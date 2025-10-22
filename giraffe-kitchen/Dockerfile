# Stage 1: Build frontend
# Force rebuild v2 - Railway hostname detection fix
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY ./giraffe-frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY ./giraffe-frontend/ ./

# Build frontend - uses runtime hostname detection (no env vars needed)
# Add build timestamp to prevent caching
ARG BUILD_DATE=unknown
RUN echo "Build date: ${BUILD_DATE}" && npm run build

# Stage 2: Build backend with frontend
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY ./giraffe-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./giraffe-backend/ .

# Copy built frontend from first stage
COPY --from=frontend-builder /frontend/dist /app/static

# Expose port
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
