"""SQLite connection and schema management."""

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


def get_database_path() -> Path:
    """Return the configured database path, defaulting to a file in backend/."""
    configured_path = os.getenv("APPLYWISE_DATABASE_PATH")
    if configured_path:
        return Path(configured_path)
    return Path(__file__).resolve().parents[1] / "applywise.db"


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    """Open a row-aware connection and guarantee that it is closed."""
    database_path = get_database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    """Create the application table if it does not already exist."""
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                job_url TEXT,
                status TEXT NOT NULL DEFAULT 'Saved',
                deadline TEXT,
                created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
            """
        )
        connection.commit()
