import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import logo from "../assets/pixl.png";

/* ================= KPI + HELPERS ================= */

const computeKPIs = (calls) => {
  const total = calls.length;
  const positive = calls.filter(c => c.final_sentiment >= 0.3).length;
  const negative = calls.filter(c => c.final_sentiment <= -0.3).length;
  const neutral = total - positive - negative;

  const avgSentiment =
    total === 0
      ? 0
      : (
          calls.reduce((sum, c) => sum + (c.final_sentiment ?? 0), 0) / total
        ).toFixed(2);

  const escalationRisk = total === 0 ? 0 : Math.round((negative / total) * 100);
  const oneCallResolution = total === 0 ? 0 : Math.round((positive / total) * 100);

  return {
    total,
    positive,
    neutral,
    negative,
    avgSentiment,
    escalationRisk,
    oneCallResolution,
  };
};

const buildSentimentTimeline = (calls) =>
  calls.slice().reverse().map((c) => ({
    date: new Date(c.created_at).toLocaleDateString(),
    sentiment: c.final_sentiment,
  }));

const normalizeCalls = (calls) =>
  calls.map((c) => ({
    ...c,
    final_sentiment: typeof c.final_sentiment === "number" ? c.final_sentiment : 0,
    agent_performance: c.agent_performance ?? {
      clarity: 0,
      confidence: 0,
      helpfulness: 0,
    },
    dissatisfaction_reasons: Array.isArray(c.dissatisfaction_reasons)
      ? c.dissatisfaction_reasons
      : [],
  }));

const scoreMap = { low: 30, moderate: 60, high: 85 };

const getAgentTrendData = (calls) => {
  let clarity = 0, confidence = 0, helpfulness = 0, count = 0;

  calls.forEach((c) => {
    const ap = c.agent_performance;
    if (!ap) return;

    const normalizeScore = (val) => {
      if (typeof val === "number") return Math.round(val * 100);
      if (typeof val === "string") return scoreMap[val.toLowerCase()] ?? 0;
      return 0;
    };

    clarity += normalizeScore(ap.clarity);
    confidence += normalizeScore(ap.confidence);
    helpfulness += normalizeScore(ap.helpfulness);
    count++;
  });

  if (count === 0) return [];

  return [
    { name: "Clarity", value: Math.round(clarity / count) },
    { name: "Confidence", value: Math.round(confidence / count) },
    { name: "Helpfulness", value: Math.round(helpfulness / count) },
  ];
};

const getIssueCategory = (summary = "") => {
  const text = summary.toLowerCase();

  if (text.includes("forex") || text.includes("exchange")) return "Forex / Exchange";
  if (text.includes("remittance") || text.includes("transfer")) return "Remittance";
  if (text.includes("rate")) return "Rate Enquiry";
  if (text.includes("delay") || text.includes("wait")) return "Service Delay";
  if (text.includes("branch") || text.includes("location")) return "Branch Coordination";
  if (text.includes("noise") || text.includes("audio")) return "Audio Quality";

  return "Other";
};

/* ================= COMPONENT ================= */

function Landing() {
  const navigate = useNavigate();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTrend, setActiveTrend] = useState("Sentiment");

  // 🔹 Trend date filter
  const [trendFromDate, setTrendFromDate] = useState("");
  const [trendToDate, setTrendToDate] = useState("");

  // 🔹 AI Summary state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [summary, setSummary] = useState(
    () => localStorage.getItem("weekly_ai_summary") || ""
  );
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/calls")
      .then((res) => res.json())
      .then((data) => setCalls(normalizeCalls(data.data || [])))
      .catch(() => alert("Failed to load call history"))
      .finally(() => setLoading(false));
  }, []);

  const filteredCalls = calls.filter((c) => {
    if (!trendFromDate || !trendToDate) return true;

    const callDate = new Date(c.created_at);
    const from = new Date(trendFromDate);
    const to = new Date(trendToDate);
    to.setHours(23, 59, 59, 999);

    return callDate >= from && callDate <= to;
  });

  const kpis = computeKPIs(calls);

  const generateSummary = async () => {
    if (!fromDate || !toDate) {
      alert("Please select a date range");
      return;
    }

    setSummary("");
    setSummaryLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: fromDate, end_date: toDate }),
      });

      const data = await res.json();
      setSummary(data.summary);
      localStorage.setItem("weekly_ai_summary", data.summary);
    } catch {
      alert("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="h-16 bg-gray-100 border-b border-gray-300 flex items-center px-6 gap-3">
        <img src={logo} alt="Logo" className="h-10" />
        <span className="text-lg font-semibold text-gray-900">Call Analyzer</span>
      </header>

      <main className="p-8 max-w-7xl mx-auto">

        {/* CTA */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Call Analysis Overview</h1>
          <button
            onClick={() => navigate("/analyze")}
            className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800"
          >
            + Analyze New Call
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <KpiCard title="Total Calls" value={kpis.total} />
          <KpiCard title="Positive Calls" value={kpis.positive} />
          <KpiCard title="Neutral Calls" value={kpis.neutral} />
          <KpiCard title="Negative Calls" value={kpis.negative} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <KpiCard title="Avg Sentiment" value={kpis.avgSentiment} />
          <KpiCard title="Escalation Risk %" value={`${kpis.escalationRisk}%`} />
          <KpiCard title="One-Call Resolution %" value={`${kpis.oneCallResolution}%`} />
        </div>

        {/* TRENDS + SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">

          {/* TRENDS */}
          <section className="bg-white border rounded-lg p-6 min-h-[340px]">
            <h2 className="text-lg font-semibold mb-3">Operational Trends</h2>

            {/* Trend Tabs */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {["Sentiment", "Call Volume", "Issues", "Dissatisfaction"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTrend(tab)}
                  className={`px-3 py-1 rounded-md text-sm border ${
                    activeTrend === tab
                      ? "bg-black text-white"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex gap-2 mb-4">
              <input type="date" value={trendFromDate} onChange={(e) => setTrendFromDate(e.target.value)} />
              <input type="date" value={trendToDate} onChange={(e) => setTrendToDate(e.target.value)} />
              {(trendFromDate || trendToDate) && (
                <button onClick={() => { setTrendFromDate(""); setTrendToDate(""); }} className="text-sm underline">
                  Clear
                </button>
              )}
            </div>

            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                {activeTrend === "Sentiment" && (
                  <LineChart data={buildSentimentTimeline(filteredCalls)}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[-1, 1]} />
                    <Tooltip />
                    <Line dataKey="sentiment" stroke="#000" />
                  </LineChart>
                )}

                {activeTrend === "Call Volume" && (
                  <LineChart data={filteredCalls.reduce((a,c)=>{
                    const d=new Date(c.created_at).toLocaleDateString();
                    const f=a.find(x=>x.date===d); f?f.count++:a.push({date:d,count:1}); return a;
                  },[])}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line dataKey="count" stroke="#000" />
                  </LineChart>
                )}

                {activeTrend === "Issues" && (
                  <BarChart data={filteredCalls.reduce((a,c)=>{
                    const k=getIssueCategory(c.call_summary);
                    const f=a.find(x=>x.issue===k); f?f.count++:a.push({issue:k,count:1}); return a;
                  },[])}>
                    <XAxis dataKey="issue" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#000" />
                  </BarChart>
                )}

                {activeTrend === "Dissatisfaction" && (
                  <BarChart data={[
                    {name:"Negative",value:filteredCalls.filter(c=>c.final_sentiment<=-0.3).length},
                    {name:"Neutral",value:filteredCalls.filter(c=>c.final_sentiment>-0.3&&c.final_sentiment<0.3).length}
                  ]}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#000" />
                  </BarChart>
                )}

                
              </ResponsiveContainer>
            </div>
          </section>

          {/* AI SUMMARY */}
          <section className="bg-white border rounded-lg p-6 min-h-[340px]">
            <h2 className="text-lg font-semibold mb-4">AI-Generated Summary</h2>

            <div className="flex gap-3 mb-4">
              <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
              <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
              <button onClick={generateSummary} className="bg-black text-white px-4 py-2 rounded">
                Generate
              </button>
            </div>

            {summaryLoading && <p className="text-sm">Generating…</p>}
            {summary && (
              <div className="bg-gray-50 border rounded p-4 text-sm max-h-64 overflow-y-auto whitespace-pre-wrap">
                {summary}
              </div>
            )}
          </section>
        </div>

        {/* TABLE */}
        <section className="bg-white border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Previous Analyses</h2>
          </div>

          {loading ? (
            <p className="p-6">Loading…</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Audio</th>
                  <th className="px-6 py-3 text-left">Verdict</th>
                  <th className="px-6 py-3 text-left">Sentiment</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(call => (
                  <tr key={call.id} className="border-t">
                    <td className="px-6 py-3">{new Date(call.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3">{call.audio_filename}</td>
                    <td className="px-6 py-3"><VerdictBadge sentiment={call.final_sentiment} /></td>
                    <td className="px-6 py-3">{call.final_sentiment.toFixed(2)}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => navigate(`/analyze/${call.id}`)} className="underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

/* SMALL COMPONENTS */

const KpiCard = ({ title, value }) => (
  <div className="bg-white border rounded-lg p-6">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-3xl font-semibold mt-2">{value}</p>
  </div>
);

const VerdictBadge = ({ sentiment }) => {
  let label = "Neutral";
  let style = "bg-gray-200 text-gray-900";

  if (sentiment >= 0.3) {
    label = "Positive";
    style = "bg-green-100 text-green-800";
  } else if (sentiment <= -0.3) {
    label = "Negative";
    style = "bg-red-100 text-red-800";
  }

  return <span className={`px-3 py-1 text-xs rounded-full ${style}`}>{label}</span>;
};

export default Landing;
