# Logs every request (path, status, time)

"""
Request/response logging middleware.

Logs every incoming request (path, method, client IP, status code, and
response time) to a file. This is useful for:
  - Debugging during development
  - Spotting repeated abuse/spam patterns
  - Basic usage analytics (how many people are using /api/chat vs /api/ask-pdf)

NOTE: This does NOT log the message content/body by default, to avoid
storing potentially sensitive health information in plain text logs.
"""

import time
import logging
import os
from fastapi import Request

from config.settings import LOG_FILE_PATH

# Make sure the logs/ folder exists before the file handler tries to write to it
log_dir = os.path.dirname(LOG_FILE_PATH)
if log_dir:
    os.makedirs(log_dir, exist_ok=True)

logger = logging.getLogger("chatbot_requests")
logger.setLevel(logging.INFO)

# Avoid adding duplicate handlers if this module gets imported more than once
if not logger.handlers:
    file_handler = logging.FileHandler(LOG_FILE_PATH)
    formatter = logging.Formatter("%(asctime)s | %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Also print to console — handy when running locally / on Render logs tab
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    client_ip = request.client.host if request.client else "unknown"

    logger.info(
        f"{client_ip} | {request.method} {request.url.path} "
        f"| status={response.status_code} | {duration_ms}ms"
    )

    return response