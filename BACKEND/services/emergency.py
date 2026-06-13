# Emergency keyword detection

"""
Emergency keyword detection.

This is intentionally simple and rule-based (not an ML model) because for a
safety feature, predictable behaviour is more important than "smartness".
If ANY keyword from the list matches, we treat the message as an emergency
and skip the normal LLM / RAG pipeline entirely.
"""

from config.settings import EMERGENCY_KEYWORDS


def detect_emergency(message: str) -> bool:
    """
    Returns True if the message contains any emergency keyword/phrase.
    """
    text = message.lower()
    return any(keyword in text for keyword in EMERGENCY_KEYWORDS)


def get_matched_keywords(message: str) -> list[str]:
    """
    Returns the list of emergency keywords found in the message.
    Useful for logging / debugging — lets you see WHY a message was flagged.
    """
    text = message.lower()
    return [keyword for keyword in EMERGENCY_KEYWORDS if keyword in text]