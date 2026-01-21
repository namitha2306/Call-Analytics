from dotenv import load_dotenv
load_dotenv()

import json
import re
from fastapi import FastAPI, UploadFile, File
from gemini_client import analyze_audio
from prompts import CALL_ANALYSIS_PROMPT
from fastapi.middleware.cors import CORSMiddleware
from repository import save_analysis
from db import get_connection
from fastapi.responses import StreamingResponse
from pdf_report import generate_call_report

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def extract_json(text: str):
    """
    Extract JSON from Gemini response (removes ```json blocks)
    """
    if not text:
        return None

    cleaned = re.sub(r"```json|```", "", text).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None
def normalize_call_result(parsed: dict):
    return {
        "call_summary": parsed.get("call_summary"),
        "final_verdict": parsed.get("final_verdict"),
        "sentiment_scores": parsed.get("sentiment_scores", []),
        "customer_sentiment_timeline": parsed.get(
            "customer_sentiment_timeline",
            {"beginning": None, "middle": None, "end": None}
        ),
        "agent_performance": parsed.get(
            "agent_performance",
            {"clarity": "N/A", "confidence": "N/A", "helpfulness": "N/A"}
        ),
        "dissatisfaction_reasons": parsed.get("dissatisfaction_reasons", [])
    }

@app.post("/analyze-call")
async def analyze_call(file: UploadFile = File(...)):
    audio_bytes = await file.read()

    raw_output = analyze_audio(audio_bytes, CALL_ANALYSIS_PROMPT)

    try:
        parsed = json.loads(raw_output)
    except:
        return {"error": "Invalid Gemini response", "raw": raw_output}

    
    call_id = save_analysis(parsed, file.filename)

    
    return {
        "id": call_id,
        "result": parsed
    }


@app.get("/calls")
def get_all_calls():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            created_at,
            audio_filename,
            verdict,
            final_sentiment,
            call_summary
        FROM call_analysis
        ORDER BY created_at DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "audio_filename": row["audio_filename"],
            "verdict": row["verdict"],
            "final_sentiment": row["final_sentiment"],
            "call_summary": row["call_summary"],
        })

    return {
        "count": len(results),
        "data": results
    }

@app.get("/calls/{call_id}")
def get_call_by_id(call_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM call_analysis
        WHERE id = ?
    """, (call_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": "Call not found"}

    # ✅ full_result_json is already valid JSON stored in DB
    
    parsed = json.loads(row["full_result_json"])
    parsed = normalize_call_result(parsed)

    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "audio_filename": row["audio_filename"],
        "verdict": row["verdict"],
        "final_sentiment": row["final_sentiment"],
        **parsed
    }

from datetime import datetime
from fastapi import Body

SUMMARY_PROMPT = """
You are an AI analyst.

Given multiple call analysis results, generate a concise executive summary.

Include:
- Overall customer sentiment trend
- Key recurring issues
- Agent performance patterns
- Risk signals (escalation, dissatisfaction)
- Clear improvement suggestions

Return ONLY plain text (no markdown, no JSON).
"""

@app.post("/summary")
def generate_summary(payload: dict = Body(...)):
    start = payload.get("start_date")
    end = payload.get("end_date")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT full_result_json
        FROM call_analysis
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at ASC
    """, (start, end))

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {"summary": "No calls found in the selected date range."}

    combined_text = ""
    for r in rows:
        data = json.loads(r["full_result_json"])
        combined_text += json.dumps(data) + "\n\n"

    gemini_input = SUMMARY_PROMPT + "\n\n" + combined_text
    summary = analyze_audio(None, gemini_input)  # Gemini text-only use

    return {"summary": summary}
@app.get("/calls/{call_id}/report")
def download_call_report(call_id: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, created_at, audio_filename, full_result_json FROM call_analysis WHERE id = ?",
        (call_id,)
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {"error": "Call not found"}

    # ✅ CRITICAL: parse JSON PER CALL
    parsed = json.loads(row["full_result_json"])

    call_data = {
        "id": row["id"],
        "created_at": row["created_at"],
        "audio_filename": row["audio_filename"],
        "call_summary": parsed.get("call_summary"),
        "customer_sentiment_timeline": parsed.get("customer_sentiment_timeline"),
        "agent_performance": parsed.get("agent_performance"),
        "dissatisfaction_reasons": parsed.get("dissatisfaction_reasons"),
        "sentiment_scores": parsed.get("sentiment_scores"),
        "final_verdict": parsed.get("final_verdict"),
    }

    pdf_buffer = generate_call_report(call_data)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=call_report_{call_id}.pdf"
        },
    )
