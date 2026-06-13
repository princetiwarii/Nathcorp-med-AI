# Output filter + response builder

"""
Output safety filter + response builder.

Every reply that goes back to the user (whether from Person A's general
chat LLM call or Person B's PDF/RAG pipeline) should pass through
`build_chat_response()` before being returned from the API. This guarantees
that:
  1. Emergency messages always look the same.
  2. Unsafe phrases (diagnosis, dosage instructions, etc.) never reach the user.
  3. The correct disclaimer is always attached.
"""

from config.settings import (
    BLOCKED_OUTPUT_PATTERNS,
    GENERAL_DISCLAIMER,
    PDF_DISCLAIMER,
    EMERGENCY_MESSAGE,
)

# Shown instead of the model's reply if unsafe content is detected
SAFE_FALLBACK_RESPONSE = (
    "I'm not able to provide that kind of information. Please consult a "
    "licensed doctor for diagnosis, medicines, or dosage related questions."
)


def contains_unsafe_content(text: str) -> bool:
    """
    Checks whether the generated text contains any blocked phrase
    (e.g. a diagnosis statement or a dosage instruction).
    """
    lowered = text.lower()
    return any(pattern in lowered for pattern in BLOCKED_OUTPUT_PATTERNS)


def sanitize_response(text: str) -> str:
    """
    Returns the original text if it's safe, otherwise returns a safe
    fallback message.
    """
    if not text:
        return SAFE_FALLBACK_RESPONSE

    if contains_unsafe_content(text):
        return SAFE_FALLBACK_RESPONSE

    return text.strip()


def build_chat_response(reply: str, is_emergency: bool = False, source: str = "general") -> dict:
    """
    Builds the final JSON-ready response dict sent to the frontend.

    Args:
        reply: the raw text returned by the LLM (Person A) or RAG chain (Person B).
                Ignored when is_emergency=True.
        is_emergency: set this to True if services.emergency.detect_emergency()
                returned True for the user's message.
        source: "general" for normal chat answers, "pdf" for PDF/RAG answers.
                Controls which disclaimer is attached.

    Returns:
        A dict matching the ChatResponse / PDFAnswerResponse schema:
        { "reply": str, "is_emergency": bool, "disclaimer": str }
    """
    if is_emergency:
        return {
            "reply": EMERGENCY_MESSAGE,
            "is_emergency": True,
            "disclaimer": GENERAL_DISCLAIMER,
        }

    safe_reply = sanitize_response(reply)
    disclaimer = PDF_DISCLAIMER if source == "pdf" else GENERAL_DISCLAIMER

    return {
        "reply": safe_reply,
        "is_emergency": False,
        "disclaimer": disclaimer,
    }