# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY giraffe-kitchen/giraffe-frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY giraffe-kitchen/giraffe-frontend/ ./

# Set build-time environment variables for Vite
ENV VITE_API_URL=""
ENV VITE_WS_URL=""
ENV VITE_ENV=production

# Build frontend
RUN npm run build

# Stage 2: Build backend with frontend
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY giraffe-kitchen/giraffe-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY giraffe-kitchen/giraffe-backend/ .

# Copy built frontend from first stage
COPY --from=frontend-builder /frontend/dist /app/static

# Create directory for database
RUN mkdir -p /data

# Expose port
EXPOSE 8000

# Run the application with startup script using bash
CMD ["bash", "start.sh"]
