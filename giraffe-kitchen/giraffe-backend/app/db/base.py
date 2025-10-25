from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool, NullPool
from app.core.config import settings
import os

# Determine if we're using PostgreSQL or SQLite
is_postgresql = 'postgresql' in settings.DATABASE_URL or 'postgres' in settings.DATABASE_URL
is_production = os.getenv('ENV', 'development') == 'production'

# Configure engine based on database type
if is_postgresql:
    # PostgreSQL with connection pooling
    engine_kwargs = {
        'poolclass': QueuePool,
        'pool_size': 5,           # Number of permanent connections
        'max_overflow': 10,       # Maximum overflow connections
        'pool_timeout': 30,       # Timeout in seconds
        'pool_recycle': 1800,     # Recycle connections every 30 minutes
        'pool_pre_ping': True,    # Test connections before using
        'echo': settings.DEBUG and not is_production,
    }

    # Add production-specific connection args
    if is_production:
        engine_kwargs['connect_args'] = {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 second statement timeout
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5,
        }

    print(f"🐘 Using PostgreSQL database with connection pooling")
else:
    # SQLite (for backwards compatibility)
    engine_kwargs = {
        'poolclass': NullPool,  # No pooling for SQLite
        'connect_args': {'check_same_thread': False},
        'pool_pre_ping': True,
        'echo': settings.DEBUG,
    }
    print(f"📁 Using SQLite database")

# Create database engine
engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
