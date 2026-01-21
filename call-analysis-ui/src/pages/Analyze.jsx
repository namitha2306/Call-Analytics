import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import logo from "../assets/pixl.png";
import { useEffect } from "react";
import { useParams } from "react-router-dom";


function Analyze() {
  const [showAnalyze, setShowAnalyze] = useState(true);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const { id } = useParams();

useEffect(() => {
  fetch("http://127.0.0.1:8000/calls")
    .then((res) => res.json())
    .then((data) => {
      const calls = data.data || data.calls || [];
      setHistory(Array.isArray(calls) ? calls : []);
    })
    .catch((err) =>
      console.error("Failed to load call history", err)
    );
}, []);
useEffect(() => {
  if (!id) return;

  fetch(`http://127.0.0.1:8000/calls/${id}`)
    .then((res) => res.json())
    .then((data) => {
      setResult(normalizeResult(data));

      setAudioUrl(`http://127.0.0.1:8000/audio/${data.audio_path}`);
    })
    .catch((err) =>
      console.error("Failed to load call by id", err)
    );
}, [id]);


const normalizeResult = (data) => {
  // Response from POST /analyze-call
  if (data.result) {
  return data.result;
}

if (data.sentiment_scores) {
  return data;
}


  // Response from GET /calls/:id
  return {
    call_summary: data.call_summary ?? null,
    sentiment_scores: data.sentiment_scores ?? [],
    customer_sentiment_timeline: data.customer_sentiment_timeline ?? null,
    agent_performance: data.agent_performance ?? null,
    dissatisfaction_reasons: data.dissatisfaction_reasons ?? [],
    final_verdict: data.final_verdict ?? data.verdict ?? null,
  };
};

  const handleAnalyze = async () => {
  if (!file) return alert("Please upload an audio file");

  const formData = new FormData();
  formData.append("file", file);

  setLoading(true);
  setResult(null);

  try {
    const res = await fetch("http://127.0.0.1:8000/analyze-call", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(normalizeResult(data));


    // ✅ Refresh history SAFELY
    const historyRes = await fetch("http://127.0.0.1:8000/calls");
    const historyData = await historyRes.json();

   const calls = historyData.data || historyData.calls || [];
setHistory(Array.isArray(calls) ? calls : []);


  } catch (err) {
    console.error("Analyze failed", err);
    alert("Failed to analyze call");
  } finally {
    setLoading(false);
  }
};






  const getVerdictBadge = (scores) => {
    if (!scores?.length) return null;
    const final = scores[scores.length - 1].score;

    if (final >= 0.3)
      return {
        label: "Positive",
        className: "bg-green-100 text-green-800 border-green-300",
      };
    if (final <= -0.3)
      return {
        label: "Negative",
        className: "bg-red-100 text-red-800 border-red-300",
      };

    return {
      label: "Neutral",
      className: "bg-gray-200 text-gray-900 border-gray-400",
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-hidden">

      {/* ================= GLOBAL HEADER ================= */}
      <header className="
        fixed top-0 left-0 right-0 h-16
        bg-gray-100 border-b border-gray-300
        flex items-center gap-3 px-6
        z-50
      ">
        <img src={logo} alt="Logo" className="h-10 w-auto" />
        <span className="text-lg font-semibold text-gray-900">
          Call Analyzer
        </span>
      </header>

      {/* LEFT RAIL */}
      <div className="
        fixed top-16 left-0 h-[calc(100%-4rem)] w-14
        bg-gray-100 border-r border-gray-300
        flex items-start justify-center pt-6
        z-50
      ">
        <button
          onClick={() => setShowAnalyze(!showAnalyze)}
          className="
            bg-white border border-gray-300
            rounded-md px-2 py-2
            shadow-sm hover:bg-gray-100
          "
        >
          ☰
        </button>
      </div>

      {/* ================= ANALYZE PANEL ================= */}
      <aside
        className={`
          fixed top-16 left-14 h-[calc(100%-4rem)] w-1/3
          bg-white border-r border-gray-200 p-6
          transform transition-transform duration-300 ease-in-out
          z-40
          ${showAnalyze ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Analyze Call
          </h2>

          <button
            onClick={() => setShowAnalyze(false)}
            className="
              text-gray-500 hover:text-gray-900
              border border-gray-300 rounded-md
              px-2 py-1 text-sm
            "
          >
            ✕
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-regular text-gray-900">
            Upload the audio
          </h2>
        </div>

        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setAudioUrl(URL.createObjectURL(selectedFile));
          }}
          className="mb-4 w-full text-sm"
        />

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Call"}
        </button>

        {/* ANALYSIS HISTORY */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Analysis History
          </h3>

          {history.length === 0 && (
            <p className="text-xs text-gray-500">
              No previous analyses
            </p>
          )}

          <ul className="space-y-2 max-h-64 overflow-y-auto">
           {Array.isArray(history) && history.map((item) => (
  <li
    key={item.id}
    onClick={async () => {
      const res = await fetch(`http://127.0.0.1:8000/calls/${item.id}`);
      const data = await res.json();
      setResult(normalizeResult(data));


      setAudioUrl(`http://127.0.0.1:8000/audio/${data.audio_path}`);
    }}
    className="
      cursor-pointer
      border border-gray-200
      rounded-md px-3 py-2
      text-sm text-gray-800
      hover:bg-gray-100
    "
  >
    Call – {new Date(item.created_at).toLocaleString()}
  </li>
))}

          </ul>
        </div>
      </aside>

      {/* ================= RESULTS PANEL ================= */}
      <main
        className={`
          pt-20 px-8 transition-all duration-300
          ${showAnalyze ? "ml-[calc(33.333%+3.5rem)]" : "ml-14"}
        `}
      >
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">
          Call Analysis Dashboard
        </h1>

        {!result && (
          <p className="text-gray-500">
            Upload an audio file and analyze the call to view insights.
          </p>
        )}

        {result && typeof result === "object" && (
          <div className="space-y-10">

            {/* === RESULTS CONTENT UNCHANGED === */}

            {/* Audio Playback */}
            <section className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                🎧 Call Audio
              </h2>
              <audio controls src={audioUrl} className="w-full" />
            </section>

            {/* Call Summary */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Call Summary
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {result.call_summary}
              </p>
            </section>

            {/* Sentiment Graph */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Sentiment Trend
              </h2>
              <div className="h-64 border border-gray-200 rounded-md p-4">
                <ResponsiveContainer width="100%" height="100%">
                  {Array.isArray(result.sentiment_scores) && result.sentiment_scores.length > 0 ? (
  <LineChart data={result.sentiment_scores}>
    <XAxis dataKey="time" />
    <YAxis domain={[-1, 1]} />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="score"
      stroke="#000000"
      strokeWidth={2}
      dot={{ r: 4 }}
    />
  </LineChart>
) : (
  <p className="text-gray-500 text-sm">
    Sentiment data not available
  </p>
)}
                </ResponsiveContainer>
              </div>
            </section>

            {/* Sentiment Timeline */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Sentiment Timeline
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                {result.customer_sentiment_timeline ? (
  <>
    <li><b>Beginning:</b> {result.customer_sentiment_timeline.beginning}</li>
    <li><b>Middle:</b> {result.customer_sentiment_timeline.middle}</li>
    <li><b>End:</b> {result.customer_sentiment_timeline.end}</li>
  </>
) : (
  <li className="italic text-gray-500">
    Sentiment timeline not available for this call
  </li>
)}


              </ul>
            </section>

            {/* Agent Performance */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Agent Performance
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li><b>Clarity:</b> {result.agent_performance.clarity}</li>
                <li><b>Confidence:</b> {result.agent_performance.confidence}</li>
                <li><b>Helpfulness:</b> {result.agent_performance.helpfulness}</li>
              </ul>
            </section>

            {/* Dissatisfaction Reasons */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Dissatisfaction Drivers
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                {Array.isArray(result.dissatisfaction_reasons) ? (
  result.dissatisfaction_reasons.map((reason, idx) => (
    <li key={idx}>{reason}</li>
  ))
) : (
  <li className="text-gray-500 italic">
    No dissatisfaction data available
  </li>
)}
              </ul>
            </section>

            {/* Final Verdict */}
            <section className="border border-gray-200 rounded-lg p-6 bg-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Final Verdict
                  <div className="mt-4">
  <button
    onClick={() =>
      window.open(`http://127.0.0.1:8000/calls/${id}/report`)
    }
    className="border border-gray-300 px-4 py-2 rounded-md
               text-sm hover:bg-gray-200"
  >
    📄 Download Call Report
  </button>
</div>

                </h2>

                {(() => {
                  const badge = getVerdictBadge(result.sentiment_scores);
                  return badge && (
                    <span className={`px-3 py-1 text-sm font-semibold border rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>

              <p className="text-gray-800">{result.final_verdict}</p>
            </section>

          </div>
        )}
      </main>
    </div>
  );
}

export default Analyze ;   