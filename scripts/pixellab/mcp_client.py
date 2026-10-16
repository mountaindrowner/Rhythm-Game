"""Tiny client for PixelLab's MCP API (JSON-RPC over HTTP).

    from mcp_client import call_tool
    text = call_tool("get_balance", {})

Reads the key from the PIXELLAB_API_KEY environment variable.
"""
import json
import os
import sys
import time
import urllib.request

URL = "https://api.pixellab.ai/mcp"


def _post(body, key):
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    })
    with urllib.request.urlopen(req, timeout=300) as r:
        raw = r.read().decode()
    msgs = [json.loads(line[5:]) for line in raw.splitlines() if line.startswith("data:")]
    return msgs[-1] if msgs else json.loads(raw)


def call_tool(name, arguments, attempts=4):
    """Call one PixelLab tool and return its text answer (retries network errors)."""
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key:
        sys.exit("Set PIXELLAB_API_KEY first.")
    body = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}
    for attempt in range(1, attempts + 1):
        try:
            d = _post(body, key)
            break
        except OSError as err:
            if attempt == attempts:
                raise
            print(f"  network error ({err}); retrying")
            time.sleep(2 ** attempt)
    if "error" in d:
        return "error: " + json.dumps(d["error"])
    return "\n".join(c.get("text", "") for c in d["result"]["content"] if c.get("type") == "text")
