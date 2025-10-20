from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.config import settings
from app.api.v1 import auth, branches, dishes, chefs, checks, ai, daily_tasks, sanitation_audits
from app.db.base import Base, engine
import os

# Create database tables on startup
os.makedirs(os.path.dirname(settings.DATABASE_URL.replace('sqlite:///', '')), exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# CORS middleware - allow all origins in development
# This must be added FIRST before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(dishes.router, prefix="/api/v1/dishes", tags=["Dishes"])
app.include_router(chefs.router, prefix="/api/v1/chefs", tags=["Chefs"])
app.include_router(checks.router, prefix="/api/v1/checks", tags=["Dish Checks"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Analysis"])
app.include_router(daily_tasks.router, prefix="/api/v1/tasks", tags=["Daily Tasks"])
app.include_router(sanitation_audits.router, prefix="/api/v1/sanitation-audits", tags=["Sanitation Audits"])


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Don't serve frontend from Railway - use Vercel instead
# This simplifies routing and prevents conflicts with API routes
