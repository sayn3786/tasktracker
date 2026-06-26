import json
import os

import psycopg
from dotenv import load_dotenv


load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")


def require_database_url():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")
    return DATABASE_URL


def connect():
    return psycopg.connect(require_database_url())


def init_db():
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )


def read_state():
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT payload FROM app_state WHERE id = 1").fetchone()
    if not row:
        return None
    payload = row[0]
    return payload if isinstance(payload, dict) else json.loads(payload)


def write_state(state):
    init_db()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO app_state (id, payload, updated_at)
            VALUES (1, %s::jsonb, NOW())
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = NOW()
            """,
            (json.dumps(state),),
        )
