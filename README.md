Call Analysis Dashboard (AI-Powered)

An AI-powered call analysis system that processes customer call audio, extracts insights using **Gemini**, and presents actionable analytics through an interactive dashboard.

---

## 🚀 Features

* 🎧 **Audio Call Analysis** using Gemini LLM
* 📊 **Operational Dashboard** with KPIs & trends
* 🧠 **AI-Generated Weekly Summary** (date-range based)
* 📈 **Multiple Trends**

  * Sentiment Trend
  * Call Volume Trend
  * Issue Category Trend
  * Dissatisfaction Trend
  * Agent Effectiveness Trend
* 📄 **Download Call Report as PDF**
* 🗂 **Historical Call Review**

---

## 📊 Key Metrics Explained

### Average Sentiment

Represents overall customer mood across calls.

```
Average Sentiment =
Sum of final sentiment scores ÷ Total calls
```

* Range: `-1 (very negative)` to `+1 (very positive)`

---

### Escalation Risk (%)

Percentage of calls likely to escalate.

```
Escalation Risk =
(Number of calls with sentiment ≤ -0.3 ÷ Total calls) × 100
```

---

### One-Call Resolution (%)

Measures how many calls ended positively (likely resolved).

```
One-Call Resolution =
(Number of calls with sentiment ≥ +0.3 ÷ Total calls) × 100
```

---

## 🧠 AI-Generated Summary

* Select a **date range**
* Gemini generates:

  * Overall call quality
  * Common issues
  * Customer sentiment patterns
  * Improvement suggestions
* Summary persists across navigation using `localStorage`

---

## 🏗 Tech Stack

**Frontend**

* React
* Recharts
* Tailwind CSS

**Backend**

* FastAPI
* SQLite
* Gemini API

---

## ▶️ How to Run

### Backend

```bash
uvicorn main:app --reload
```

### Frontend

```bash
npm install
npm run dev
```

---

## 📌 Notes

* Sentiment thresholds are chosen to avoid false positives
* Agent performance is extracted directly from Gemini responses
* Issue categorization is derived from call summaries

---

## 📈 Future Enhancements

* Agent-wise performance leaderboard
* Automatic anomaly detection
* Export full dashboard report (PDF)
* Role-based access control




