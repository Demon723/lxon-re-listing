#!/usr/bin/env python3
"""Rate-limiting JSON-RPC proxy for the public write endpoint.
Forwards to besu 127.0.0.1:8545. Per-IP token bucket: eth_sendRawTransaction
and other write methods are limited; reads pass through unthrottled.
"""
import json, time, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

UPSTREAM = "http://127.0.0.1:8545"
WRITE_METHODS = {"eth_sendRawTransaction", "eth_sign", "eth_signTransaction",
                 "personal_sign", "personal_ecRecover", "admin_", "debug_",
                 "miner_", "txpool_"}
RATE_PER_MIN = 30
buckets = {}
lock = threading.Lock()

def allowed(ip):
    now = time.time()
    with lock:
        b = buckets.setdefault(ip, [RATE_PER_MIN, now])
        b[0] += (now - b[1]) * (RATE_PER_MIN / 60.0)
        b[1] = now
        if b[0] >= 1.0:
            b[0] -= 1.0
            return True
        return False

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "POST, OPTIONS")
        self.send_header("access-control-allow-headers", "content-type")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "POST, OPTIONS")
        self.send_header("access-control-allow-headers", "content-type")
        self.end_headers()
    def do_POST(self):
        n = int(self.headers.get("content-length") or 0)
        raw = self.rfile.read(n)
        try:
            req = json.loads(raw)
        except Exception:
            return self._send(400, {"jsonrpc":"2.0","id":None,"error":{"code":-32700,"message":"parse error"}})
        calls = req if isinstance(req, list) else [req]
        methods = [c.get("method","") for c in calls if isinstance(c, dict)]
        writes = [m for m in methods if any(m == w or m.startswith(w) for w in WRITE_METHODS)]
        ip = (self.headers.get("x-forwarded-for") or self.client_address[0]).split(",")[0].strip()
        if writes and not allowed(ip):
            return self._send(429, {"jsonrpc":"2.0","id":None,"error":{"code":-32005,"message":"rate limit: max 30 write calls/min per IP"}})
        try:
            r = urlopen(Request(UPSTREAM, data=raw, headers={"content-type":"application/json"}), timeout=30)
            body = r.read()
            self.send_response(r.status)
            self.send_header("content-type","application/json")
            self.send_header("access-control-allow-origin","*")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except HTTPError as e:
            self.send_response(e.code); self.end_headers(); self.wfile.write(e.read())
        except URLError as e:
            self._send(502, {"jsonrpc":"2.0","id":None,"error":{"code":-32000,"message":str(e)}})
    do_GET = do_POST

ThreadingHTTPServer(("127.0.0.1", 8547), H).serve_forever()
