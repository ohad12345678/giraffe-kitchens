# Giraffe Kitchens - Backend API

FastAPI backend for the Giraffe Kitchens Food Quality System.

## Setup

### 1. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Setup environment variables

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the server

```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database Migrations

Create a new migration:

```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:

```bash
alembic upgrade head
```

Rollback:

```bash
alembic downgrade -1
```

## Project Structure

```
app/
├── api/          # API endpoints
│   └── v1/       # Version 1 routes
├── core/         # Core functionality (config, security)
├── db/           # Database configuration
├── models/       # SQLAlchemy models
├── schemas/      # Pydantic schemas
└── main.py       # FastAPI app entry point
```

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy using the Dockerfile

### Fly.io

1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
2. Run `fly launch`
3. Set secrets: `fly secrets set DATABASE_URL=...`
4. Deploy: `fly deploy`
