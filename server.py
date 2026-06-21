import json
import os
import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "tasktracker.sqlite3"

app = Flask(__name__, static_folder=None)


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                payload TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def read_state():
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("SELECT payload FROM app_state WHERE id = 1").fetchone()
    if not row:
        return None
    return json.loads(row[0])


def write_state(state):
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO app_state (id, payload, updated_at)
            VALUES (1, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = CURRENT_TIMESTAMP
            """,
            (json.dumps(state),),
        )


@app.get("/api/tasktracker/state")
def get_tasktracker_state():
    return jsonify({"state": read_state()})


@app.post("/api/tasktracker/state")
@app.put("/api/tasktracker/state")
def save_tasktracker_state():
    data = request.get_json(silent=True) or {}
    state = data.get("state")
    if not isinstance(state, dict):
        return jsonify({"error": "state must be an object"}), 400
    write_state(state)
    return jsonify({"ok": True})


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:path>")
def static_files(path):
    if path.startswith("api/"):
        return jsonify({"error": "not found"}), 404
    return send_from_directory(BASE_DIR, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
