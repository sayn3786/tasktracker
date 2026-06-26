import json
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[2]))
from db import read_state, write_state


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        try:
            self._send_json(200, {"state": read_state()})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def do_POST(self):
        self._save()

    def do_PUT(self):
        self._save()

    def _save(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            state = data.get("state")
            if not isinstance(state, dict):
                self._send_json(400, {"error": "state must be an object"})
                return
            write_state(state)
            self._send_json(200, {"ok": True})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})
