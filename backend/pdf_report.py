from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from io import BytesIO


def generate_call_report(call_data: dict):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    elements = []

    def add_heading(text):
        elements.append(Paragraph(f"<b>{text}</b>", styles["Heading2"]))
        elements.append(Spacer(1, 0.2 * inch))

    def add_text(text):
        elements.append(Paragraph(text or "N/A", styles["Normal"]))
        elements.append(Spacer(1, 0.15 * inch))

    # ================= HEADER =================
    elements.append(Paragraph("<b>Call Analysis Report</b>", styles["Title"]))
    elements.append(Spacer(1, 0.3 * inch))

    # ================= METADATA =================
    add_heading("Call Details")
    add_text(f"Call ID: {call_data.get('id')}")
    add_text(f"Date: {call_data.get('created_at')}")
    add_text(f"Audio File: {call_data.get('audio_filename')}")

    # ================= SUMMARY =================
    add_heading("Call Summary")
    add_text(call_data.get("call_summary"))

    # ================= SENTIMENT =================
    add_heading("Sentiment Timeline")
    timeline = call_data.get("customer_sentiment_timeline") or {}
    add_text(f"Beginning: {timeline.get('beginning', 'N/A')}")
    add_text(f"Middle: {timeline.get('middle', 'N/A')}")
    add_text(f"End: {timeline.get('end', 'N/A')}")

    # ================= AGENT PERFORMANCE =================
    add_heading("Agent Performance")
    ap = call_data.get("agent_performance") or {}
    add_text(f"Clarity: {ap.get('clarity', 'N/A')}")
    add_text(f"Confidence: {ap.get('confidence', 'N/A')}")
    add_text(f"Helpfulness: {ap.get('helpfulness', 'N/A')}")

    # ================= DISSATISFACTION =================
    add_heading("Dissatisfaction Drivers")
    reasons = call_data.get("dissatisfaction_reasons") or []
    if reasons:
        elements.append(
            ListFlowable(
                [ListItem(Paragraph(r, styles["Normal"])) for r in reasons],
                bulletType="bullet",
            )
        )
    else:
        add_text("None reported")

    # ================= FINAL VERDICT =================
    add_heading("Final Verdict")
    add_text(call_data.get("final_verdict"))

    doc.build(elements)
    buffer.seek(0)
    return buffer
