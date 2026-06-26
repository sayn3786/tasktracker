import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from db import read_state, write_state

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=None)


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
