"""Database engine/session setup, per doc §6.3: relational data layer for
asset, job, segment, query, and insight records (Postgres + pgvector).
"""
import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"sslmode": "require"})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_vector_extension() -> None:
    """Segment.embedding uses pgvector's Vector type — the extension must
    exist before Base.metadata.create_all() can create that column."""
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
