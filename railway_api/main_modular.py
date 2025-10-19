# railway_api/main_modular.py
# MODULAR VERSION - Use this instead of main.py for better organization

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import connect_to_mongo, close_mongo_connection
from middleware import LoggingMiddleware, RateLimitMiddleware, MetadataScrubbingMiddleware

# Import route modules
from routes import auth, avatars, mood, geolocation, professionals, communities, messaging, journal,  chatbot

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Mental Health App - Railway API...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()

# Create FastAPI app
app = FastAPI(
    title="Mental Health App - Railway API",
    version="2.0.0",
    description="Privacy-first mental health platform with AI support",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(MetadataScrubbingMiddleware)

# Include routers (each on separate line)
app.include_router(auth.router)
app.include_router(avatars.router)
app.include_router(mood.router)
app.include_router(geolocation.router)
app.include_router(professionals.router)
app.include_router(communities.router)
app.include_router(messaging.router)
app.include_router(journal.router)
app.include_router(chatbot.router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "app": "Mental Health App - Railway API",
        "version": "2.0.0",
        "status": "running",
        "model_server": os.getenv("MODEL_SERVER_URL", "http://localhost:8001"),
        "features": [
            "Anonymous Wellness Communities",
            "Mood-Based Avatars",
            "Remote Avatar Jump",
            "Violence Reporting",
            "Professional Support Directory",
            "Geolocation Support"
        ]
    }

# Health check
@app.get("/health")
async def health_check():
    from database import get_database
    try:
        db = get_database()
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)