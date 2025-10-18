from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, branches, dishes, chefs, checks, ai, daily_tasks

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(dishes.router, prefix="/api/v1/dishes", tags=["Dishes"])
app.include_router(chefs.router, prefix="/api/v1/chefs", tags=["Chefs"])
app.include_router(checks.router, prefix="/api/v1/checks", tags=["Dish Checks"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI Analysis"])
app.include_router(daily_tasks.router, prefix="/api/v1/tasks", tags=["Daily Tasks"])


@app.get("/")
def root():
    """Root endpoint - health check."""
    return {
        "message": "Giraffe Kitchens API",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
