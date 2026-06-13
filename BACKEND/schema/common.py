#  Shared Pydantic models (the API "contract")

"""
Shared request/response models (the "contract" between Person A, B, and C).

Everyone should import these instead of redefining their own versions, so
that the frontend always receives a consistent shape no matter which
endpoint answered the question.
"""

from pydantic import BaseModel


# ---------- General chat (Person A) ----------
class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    is_emergency: bool
    disclaimer: str


# ---------- PDF upload & Q&A (Person B) ----------
class PDFUploadResponse(BaseModel):
    session_id: str
    message: str


class PDFQuestionRequest(BaseModel):
    session_id: str
    question: str


class PDFAnswerResponse(BaseModel):
    reply: str
    is_emergency: bool
    disclaimer: str