from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from app.core.config import settings
from app.api.v1 import auth, branches, dishes, chefs, checks, ai, daily_tasks, sanitation_audits
from app.api.endpoints import manager_evaluations
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

# Include routers FIRST - these take priority
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(dishes.router, prefix="/api/v1/dishes", tags=["Dishes"])
app.include_router(chefs.router, prefix="/api/v1/chefs", tags=["Chefs"])
app.include_router(checks.router, prefix="/api/v1/checks", tags=["Dish Checks"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Analysis"])
app.include_router(daily_tasks.router, prefix="/api/v1/tasks", tags=["Daily Tasks"])
app.include_router(sanitation_audits.router, prefix="/api/v1/sanitation-audits", tags=["Sanitation Audits"])
app.include_router(manager_evaluations.router, prefix="/api/v1/manager-evaluations", tags=["Manager Evaluations"])


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Serve frontend static files AFTER API routes
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    # Mount assets directory
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Serve root
    @app.get("/", response_class=FileResponse)
    async def serve_root():
        return FileResponse(os.path.join(static_dir, "index.html"))

    # Serve vite.svg
    @app.get("/vite.svg", response_class=FileResponse)
    async def serve_vite_svg():
        return FileResponse(os.path.join(static_dir, "vite.svg"))

    # Catch-all for SPA routing - ONLY for GET requests, NOT POST
    # This serves index.html for /dashboard, /reports, etc.
    @app.get("/{full_path:path}", response_class=FileResponse)
    async def serve_spa(full_path: str):
        # NEVER serve frontend for API routes - let them 404 instead
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # Check if it's a specific file first
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise serve index.html for SPA routing
        return FileResponse(os.path.join(static_dir, "index.html"))
