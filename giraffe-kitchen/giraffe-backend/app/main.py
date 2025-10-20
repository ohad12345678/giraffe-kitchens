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


# Mount static files for frontend
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
print(f"🔍 Checking static directory: {static_dir}")
print(f"📁 Static directory exists: {os.path.exists(static_dir)}")
if os.path.exists(static_dir):
    print(f"📂 Static directory contents: {os.listdir(static_dir)}")

if os.path.exists(static_dir):
    print("✅ Mounting static files for frontend")

    # Mount static assets
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    # Serve index.html for root
    @app.get("/")
    async def serve_root():
        """Serve frontend index.html for root path."""
        return FileResponse(os.path.join(static_dir, "index.html"))

    # Serve vite.svg
    @app.get("/vite.svg")
    async def serve_vite_svg():
        """Serve vite.svg."""
        return FileResponse(os.path.join(static_dir, "vite.svg"))

    # Catch-all for frontend SPA routing (but exclude /api/ and /health)
    @app.api_route("/{full_path:path}", methods=["GET"], include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve frontend for SPA routing (dashboard, reports, etc)."""
        # Return index.html for all frontend routes
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    print("⚠️  Static directory not found - frontend will not be served")
