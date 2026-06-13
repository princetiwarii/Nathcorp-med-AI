 # Blocks clients sending too many requests

"""
Simple in-memory rate limiting middleware (abuse prevention).

Tracks how many requests each client IP has made in a rolling time window.
If a client exceeds RATE_LIMIT_REQUESTS within RATE_LIMIT_WINDOW_SECONDS,
they receive an HTTP 429 ("Too Many Requests") response instead of hitting
the LLM/RAG pipeline.

LIMITATIONS (good to mention to your team / in the README):
- This storage is in-memory, so it resets if the server restarts and does
  NOT work correctly if you deploy multiple server instances/workers behind
  a load balancer (each instance keeps its own counts). For a free-tier demo
  project this is fine. For production, replace `request_log` with Redis.
"""

import time
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse

from config.settings import RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS

# { "client_ip": [timestamp1, timestamp2, ...] }
request_log: dict[str, list[float]] = defaultdict(list)


async def rate_limit_middleware(request: Request, call_next):
    # Don't rate-limit health checks / static files, only API calls
    if not request.url.path.startswith("/api"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Keep only timestamps within the current rolling window
    timestamps = [
        t for t in request_log[client_ip]
        if now - t < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(timestamps) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={
                "detail": (
                    f"Too many requests. Please wait a moment before trying "
                    f"again (limit: {RATE_LIMIT_REQUESTS} requests per "
                    f"{RATE_LIMIT_WINDOW_SECONDS} seconds)."
                )
            },
        )

    timestamps.append(now)
    request_log[client_ip] = timestamps

    return await call_next(request)