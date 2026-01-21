import json
import uuid
from datetime import datetime
from db import get_connection


def save_analysis(result: dict, audio_filename: str):
    """
    Saves Gemini call analysis output to DB
    """
    conn = get_connection()
    cur = conn.cursor()

    call_id = str(uuid.uuid4())

    sentiment_scores = result.get("sentiment_scores", [])
    final_sentiment = sentiment_scores[-1]["score"] if sentiment_scores else 0.0

    cur.execute("""
        INSERT INTO call_analysis (
            id,
            created_at,
            audio_filename,
            verdict,
            final_sentiment,
            call_summary,
            full_result_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        call_id,
        datetime.utcnow().isoformat(),
        audio_filename,
        result.get("final_verdict"),
        final_sentiment,
        result.get("call_summary"),
        json.dumps(result)
    ))

    conn.commit()
    conn.close()

    return call_id
