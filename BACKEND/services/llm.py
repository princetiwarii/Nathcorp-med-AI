import os
import google.generativeai as genai
from config.settings import SYSTEM_PROMPT_GENERAL
from services.medical_api import fetch_medical_context

# Initialize Gemini client
try:
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        gemini_client_configured = True
    else:
        gemini_client_configured = False
except Exception as e:
    print(f"Warning: Failed to configure Gemini. Is GEMINI_API_KEY set? {e}")
    gemini_client_configured = False


def ask_general_question(question: str) -> str:
    """
    Asks a general health question to the Gemini model, strictly adhering to the 
    safety prompt rules (no diagnosis, no prescriptions, simple language).
    """
    if not gemini_client_configured:
        return "Error: Gemini API is not configured. Please set GEMINI_API_KEY in your .env file."

    # Construct the prompt by prepending the system instructions
    # Note: For basic text generation models, prepending the system prompt to the user
    # prompt is a common approach if the API doesn't have a dedicated system instruction field.
    # gemini-1.5-flash does support system instructions via system_instruction param.
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT_GENERAL
        )
        
        # 1. Fetch public medical context from APIs
        api_context = fetch_medical_context(question)
        
        # 2. Build the augmented prompt
        augmented_prompt = question
        if api_context:
            augmented_prompt = f"Public Health API Context:\n{api_context}\n\nUser Question:\n{question}"
            
        # 3. Generate response using the augmented prompt
        response = model.generate_content(
            augmented_prompt,
            generation_config=genai.GenerationConfig(temperature=0.3)
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API for general chat: {e}")
        return "Sorry, I encountered an error while trying to process your question."
