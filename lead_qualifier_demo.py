import os
import json
from google import genai
from google.genai import types

# 1. Provide your Gemini API key (from https://aistudio.google.com/)
# You can set it as an environment variable or replace the placeholder below
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

def process_lead(lead_message: str):
    """
    Analyzes an incoming customer message, determines intent, budget,
    urgency, and generates a personalized response.
    """
    if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        print("⚠️ Please set your GEMINI_API_KEY before running!")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are an AI lead qualification assistant for a business in Mumbai.
    Analyze the following incoming lead message from a potential client:
    
    Lead Message: "{lead_message}"
    
    Extract and return STRICT JSON with the following keys:
    - client_name: (string or null if unknown)
    - requirement: (concise summary of what they need)
    - budget_category: ("Low", "Medium", "High", "Unspecified")
    - urgency: ("Immediate", "This Week", "Exploring")
    - suggested_reply: (polite, professional WhatsApp reply acknowledging their requirement)
    """

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )

    result = json.loads(response.text)
    print("\n✅ Lead Processed Successfully:")
    print(json.dumps(result, indent=2))
    return result

if __name__ == "__main__":
    # Test sample message from an incoming lead
    sample_lead = "Hi, I have a real estate firm in Thane. We get around 40 leads every day from Facebook ads but our sales team misses follow-ups. Need an automated WhatsApp bot ASAP. What's the cost?"
    print(f"Incoming lead:\n{sample_lead}")
    process_lead(sample_lead)
