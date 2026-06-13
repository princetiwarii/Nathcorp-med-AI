 # All constants: keywords, disclaimers, limits, prompts

"""
Central configuration file.
All constants, keywords, disclaimers, and tunable settings live here so that
Person A and Person B can simply import from this file instead of hardcoding
values in their own modules.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ----------------------------------------------------------------------
# General app settings
# ----------------------------------------------------------------------
APP_NAME = "AI Medical Information Chatbot"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# ----------------------------------------------------------------------
# Rate limiting (abuse prevention)
# ----------------------------------------------------------------------
RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "10"))              # max requests
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))  # per window (seconds)

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
LOG_FILE_PATH = os.getenv("LOG_FILE_PATH", "logs/requests.log")

# ----------------------------------------------------------------------
# Emergency keyword list
# If any of these phrases appear in the user's message, the bot skips the
# normal LLM/RAG flow entirely and returns the emergency message instead.
# ----------------------------------------------------------------------
EMERGENCY_KEYWORDS = [
    "chest pain",
    "can't breathe", "cannot breathe", "difficulty breathing", "shortness of breath",
    "heavy bleeding", "uncontrolled bleeding", "lots of blood",
    "unconscious", "unresponsive", "fainted", "passed out",
    "stroke", "face drooping", "slurred speech", "numbness on one side",
    "severe allergic reaction", "anaphylaxis", "swelling of throat", "throat closing",
    "suicidal", "suicide", "want to die", "kill myself", "overdose",
    "seizure", "convulsions", "blue lips", "severe burns", "poisoning",
]

# ----------------------------------------------------------------------
# Disclaimers shown to the user along with every response
# ----------------------------------------------------------------------
GENERAL_DISCLAIMER = (
    "This information is for general educational purposes only and is not a "
    "medical diagnosis or treatment recommendation. Please consult a licensed "
    "doctor for medical advice."
)

PDF_DISCLAIMER = (
    "This answer is generated only from the document you uploaded and is for "
    "informational purposes. Please discuss your report with a licensed doctor."
)

EMERGENCY_MESSAGE = (
    "Your message describes symptoms that could be a medical emergency. "
    "Please contact your local emergency number or go to the nearest hospital "
    "immediately. This chatbot cannot provide emergency care."
)

# ----------------------------------------------------------------------
# Phrases the bot must NEVER output (used to filter LLM responses)
# If the generated reply contains any of these, it is replaced with a
# safe fallback message before being sent to the user.
# ----------------------------------------------------------------------
BLOCKED_OUTPUT_PATTERNS = [
    "i diagnose you with",
    "you have been diagnosed with",
    "you should take",
    "take 2 tablets", "take two tablets",
    "increase your dose", "decrease your dose", "double the dose",
    "stop taking your medicine", "stop your medication",
    "you have cancer", "you have covid", "you have tb", "you have hiv",
    "i recommend the following prescription",
]

# ----------------------------------------------------------------------
# Shared system prompts (used by Person A for the LLM, and Person B for RAG)
# Defined here so the "safety rules" the model follows live in one place.
# ----------------------------------------------------------------------
SYSTEM_PROMPT_GENERAL = """You are a general health information assistant for an educational project.

Rules you must always follow:
- Do not diagnose any disease or condition.
- Do not prescribe medicines or suggest dosages.
- Do not tell the user to start, stop, or change any medication.
- Keep answers simple and easy to understand.
- Always recommend the user consult a licensed doctor for medical decisions.
- If unsure, say so honestly instead of guessing.
"""

SYSTEM_PROMPT_PDF = """You are a document question-answering assistant for an educational medical chatbot.

Rules you must always follow:
- Answer ONLY using the provided document context, never outside knowledge.
- Do not diagnose the user or say whether results are normal/abnormal.
- Do not suggest, change, or recommend any medicine or dosage.
- If the answer is not in the context, say the document does not contain that information.
- Remind the user to discuss the report with their doctor.
"""