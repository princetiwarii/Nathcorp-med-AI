"""

This file shows how the safety + middleware pieces plug into a FastAPI app
on their own, with a small fake "/api/chat-demo" endpoint so you can test
emergency detection, rate limiting, logging, and the safety filter without
needing Person A's or Person B's code yet.

When the project is merged, this file gets REPLACED by a combined main.py
(see the "Integration Guide" in README.md) — Person A and Person B's real
routers get included here instead of the demo endpoint.
"""

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*ARC4.*")

import os
# Suppress TensorFlow C++ logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
# Suppress GRPC warnings (like ALTS creds ignored)
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

import logging
# Suppress TensorFlow python warnings
logging.getLogger("tensorflow").setLevel(logging.ERROR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import APP_NAME, ALLOWED_ORIGINS
from middleware.logging import log_requests_middleware
from middleware.rate_limits import rate_limit_middleware
from services.emergency import detect_emergency
from services.safety import build_chat_response
from schema.common import ChatRequest, ChatResponse
from routers.pdf import router as pdf_router
from routers.chat import router as chat_router

app = FastAPI(title=APP_NAME)

# ----- CORS -----
# NOTE: allow_origins=["*"] cannot be combined with allow_credentials=True per browser spec.
# Since no cookies/auth-headers are used, credentials is set to False.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Custom middleware -----
# NOTE: middleware registered LAST runs FIRST on the way in.
# Order here: rate limit check happens before logging.
app.middleware("http")(log_requests_middleware)
app.middleware("http")(rate_limit_middleware)


@app.get("/", include_in_schema=False)
def root():
    return {"status": "Nathcorp Med AI backend running"}


@app.get("/health")
def health_check():
    """Simple endpoint to confirm the server is alive (use for Render health checks)."""
    return {"status": "ok"}


# Mount the real Chat router (Person A's work)
app.include_router(chat_router, prefix="/api", tags=["General Chat"])

# Mount the real PDF router (Person B's work)
app.include_router(pdf_router, prefix="/api", tags=["PDF & RAG"])