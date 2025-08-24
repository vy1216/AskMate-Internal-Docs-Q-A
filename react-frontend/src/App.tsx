import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [idkMode, setIdkMode] = useState(true);
  const [topK, setTopK] = useState(6);
  const [temperature, setTemperature] = useState(0.2);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  const gradientStyle = useMemo(() => ({ background: 'linear-gradient(120deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', minHeight: '100vh', color: 'white' }), []);

  async function onAsk() {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const r = await axios.post(`${API_BASE}/api/ask`, { query, idkMode, topK, temperature, channel: 'web' });
      setAnswer(r.data.answer || '');
      setSources(r.data.sources || []);
      // naive local suggestions
      const ql = query.toLowerCase();
      const seed: Record<string, string[]> = { leave: ['What is our leave policy?', 'Maternity leave policy?', 'Sick leave process?'], policy: ['Refund policy?', 'Security policy?', 'Data retention policy?'], expense: ['Expense reimbursement?', 'Allowed categories?', 'Receipt requirements?'] };
      const agg = Object.entries(seed).flatMap(([k, v]) => ql.includes(k) ? v : []);
      setSuggestions(agg.slice(0, 4));
    } catch (e: any) {
      setAnswer(e?.response?.data?.error || e?.message || 'Error');
    } finally { setLoading(false); }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    mediaRecorder.current = rec;
    const chunks: Blob[] = [];
    rec.ondataavailable = ev => chunks.push(ev.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      // For now, we do not send to backend for Whisper; we can add later
      // as a quick UX, just note recording ended
      console.log('Recorded blob', blob.size);
    };
    rec.start();
    setRecording(true);
  }
  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  return (
    <div style={gradientStyle}>
      <div className="container">
        <header className="hero">
          <span className="badge">AskMate</span>
          <h1>Your AI Knowledge Buddy</h1>
          <p className="subtitle">Ask anything about your docs. Get answers with sources, voice or text. Smart suggestions included.</p>
        </header>

        <div className="card">
          <div className="row">
            <input className="input" placeholder="What’s our refund policy?" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAsk()} />
            <button className="btn" onClick={onAsk} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
            {!recording ? <button className="btn" onClick={startRecording}>🎙️ Voice</button> : <button className="btn" onClick={stopRecording}>Stop</button>}
          </div>
          <div className="row options">
            <label><input type="checkbox" checked={idkMode} onChange={e => setIdkMode(e.target.checked)} /> I don't know mode</label>
            <label>Context
              <input type="range" min={2} max={12} value={topK} onChange={e => setTopK(parseInt(e.target.value, 10))} /> {topK}
            </label>
            <label>Creativity
              <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} /> {temperature}
            </label>
          </div>
        </div>

        {answer && (
          <div className="card answer">
            <div className="answer-title">Answer</div>
            <div className="answer-body">{answer}</div>
            {sources?.length ? (<>
              <hr />
              <div className="sources">
                <div>Sources</div>
                <ul>
                  {sources.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </>) : null}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="card suggestions">
            <b>You might also ask:</b> {suggestions.map((s, i) => <code key={i} className="pill" onClick={() => setQuery(s)}>{s}</code>)}
          </div>
        )}

        <div className="grid">
          <div className="metric">
            <div className="metric-value">⚡</div>
            <div className="metric-label">Instant Answers</div>
          </div>
          <div className="metric">
            <div className="metric-value">🧩</div>
            <div className="metric-label">Smart Suggestions</div>
          </div>
          <div className="metric">
            <div className="metric-value">🔈</div>
            <div className="metric-label">Voice Search</div>
          </div>
        </div>
      </div>
    </div>
  );
};