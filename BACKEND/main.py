"""

This file shows how the safety + middleware pieces plug into a FastAPI app
on their own, with a small fake "/api/chat-demo" endpoint so you can test
emergency detection, rate limiting, logging, and the safety filter without
needing Person A's or Person B's code yet.

When the project is merged, this file gets REPLACED by a combined main.py
(see the "Integration Guide" in README.md) — Person A and Person B's real
routers get included here instead of the demo endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import APP_NAME, ALLOWED_ORIGINS
from middleware.logging import log_requests_middleware
from middleware.rate_limits import rate_limit_middleware
from services.emergency import detect_emergency
from services.safety import build_chat_response
from schema.common import ChatRequest, ChatResponse

app = FastAPI(title=APP_NAME)

# ----- CORS -----
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Custom middleware -----
# NOTE: middleware registered LAST runs FIRST on the way in.
# Order here: rate limit check happens before logging.
app.middleware("http")(log_requests_middleware)
app.middleware("http")(rate_limit_middleware)


@app.get("/health")
def health_check():
    """Simple endpoint to confirm the server is alive (use for Render health checks)."""
    return {"status": "ok"}


# ------------------------------------------------------------------
# DEMO endpoint — test the safety pipeline end-to-end without an LLM
# ------------------------------------------------------------------
@app.post("/api/chat-demo", response_model=ChatResponse)
def chat_demo(payload: ChatRequest):
    message = payload.message.strip()

    # Step 1: emergency check (always runs first)
    if detect_emergency(message):
        return build_chat_response(reply="", is_emergency=True)

    # Step 2: in the real project, Person A's LLM call happens here.
    # We fake it for now so this file runs standalone.
    fake_llm_reply = (
        f"(demo reply) You asked: '{message}'. "
        f"In the full app, the LLM's real answer would appear here."
    )

    # Step 3: pass the reply through the safety filter + attach disclaimer
    return build_chat_response(reply=fake_llm_reply, is_emergency=False, source="general")