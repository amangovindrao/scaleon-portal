"""
Database setup.

Uses SQLite for local development (zero-config, file-based).
To move to PostgreSQL later, just change DATABASE_URL to something like:
    postgresql://user:password@localhost/scaleon_portal
and `pip install psycopg2-binary`. SQLAlchemy handles the rest —
no model code needs to change.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./scaleon_portal.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed only for SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
