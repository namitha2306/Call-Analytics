import os
from google import genai

API_KEY = os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not found in environment")

client = genai.Client(api_key=API_KEY)
def analyze_audio(audio_bytes: bytes, prompt: str):
    response = client.models.generate_content(
        model="models/gemini-3-flash-preview",
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "audio/mpeg",
                            "data": audio_bytes
                        }
                    }
                ]
            }
        ]
    )
    return response.text
