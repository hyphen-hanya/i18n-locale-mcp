#!/usr/bin/env python3
"""Detached render of the listing cover via the free GPU queue gateway.

Survives the caller's session being reaped: writes status to assets/render_status.json
and the PNG to assets/cover_raw.png.
"""
import json, os, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
GW = "http://100.124.114.106:8000"
OUT = os.path.join(HERE, "cover_raw.png")
STATUS = os.path.join(HERE, "render_status.json")

PROMPT = (
    "dark charcoal tech background with a subtle blueprint grid, minimal flat vector "
    "illustration of a stylized terminal window showing abstract glowing code lines, "
    "next to a wireframe globe, small decorative multilingual letterforms floating around "
    "the globe, a small glowing connector badge, soft teal and violet accents, generous "
    "negative space, clean modern developer product art, no text, no words, no people"
)


def get(path, timeout=60):
    with urllib.request.urlopen(GW + path, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def status(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(STATUS, "w") as f:
        json.dump(kw, f, indent=2)


def main():
    status(state="waiting_for_idle")
    # Wait for any in-flight job (incl. an orphaned one) to clear.
    for _ in range(120):
        try:
            q = get("/queue")
        except Exception as e:
            status(state="queue_unreachable", error=str(e))
            time.sleep(10)
            continue
        if q.get("running", 0) == 0:
            break
        time.sleep(15)
    else:
        status(state="gave_up_queue_busy")
        return 1

    q = urllib.parse.urlencode({
        "prompt": PROMPT, "width": 1024, "height": 768, "steps": 8, "kind": "batch",
    })
    url = GW + "/generate?" + q
    status(state="rendering")
    t0 = time.time()
    try:
        with urllib.request.urlopen(url, timeout=1800) as r:
            data = r.read()
    except Exception as e:
        status(state="failed", error=f"{type(e).__name__}: {e}", secs=round(time.time() - t0, 1))
        return 1
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        status(state="bad_payload", bytes=len(data), secs=round(time.time() - t0, 1))
        return 1
    with open(OUT, "wb") as f:
        f.write(data)
    status(state="done", bytes=len(data), secs=round(time.time() - t0, 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
