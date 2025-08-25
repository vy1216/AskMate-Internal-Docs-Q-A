import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';
import UploadSources from './UploadSources'; // Make sure you have created this file
import AnalyticsDashboard from './AnalyticsDashboard'; // Make sure you have created this file
import Settings from './Settings'; // Make sure you have created this file

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// This is the main content of your original App.tsx, now in its own component.
// This helps keep the main App.tsx file clean and organized.
const MainContent = () => {
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

    async function onAsk() {
        if (!query.trim()) return;
        setLoading(true);
        setAnswer('');
        setSources([]);
        try {
            const r = await axios.post(`${API_BASE}/api/ask`, {
                query,
                idkMode,
                topK,
                temperature,
                channel: 'web'
            });
            setAnswer(r.data.answer || '');
            setSources(r.data.sources || []);
            // Naive local suggestions
            const ql = query.toLowerCase();
            const seed: Record<string, string[]> = {
                leave: ['What is our leave policy?', 'Maternity leave policy?', 'Sick leave process?'],
                policy: ['Refund policy?', 'Security policy?', 'Data retention policy?'],
                expense: ['Expense reimbursement?', 'Allowed categories?', 'Receipt requirements?']
            };
            const agg = Object.entries(seed).flatMap(([k, v]) => ql.includes(k) ? v : []);
            setSuggestions(agg.slice(0, 4));
        } catch (e: any) {
            setAnswer(e?.response?.data?.error || e?.message || 'Error');
        } finally {
            setLoading(false);
        }
    }

    async function startRecording() { /* ... */ }
    function stopRecording() { /* ... */ }

    return (
        <div className="main-content">
            <header className="hero-section">
                <div className="hero-text-container">
                    <div className="badge">AskMate</div>
                    <h1 className="title">Your AI Knowledge Buddy</h1>
                    <p className="subtitle">Ask anything about your docs. Get answers with sources, voice or text. Smart suggestions included.</p>
                </div>
                <div className="hero-card">
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
            </header>
            <div className="card">
                <div className="query-input-row">
                    <input
                        className="input"
                        placeholder="What’s our refund policy?"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onAsk()}
                    />
                    <button className="btn btn-ask" onClick={onAsk} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</button>
                    {!recording ? (
                        <button className="btn btn-voice" onClick={startRecording}>🎙️ Voice</button>
                    ) : (
                        <button className="btn btn-voice" onClick={stopRecording}>Stop</button>
                    )}
                </div>
                <div className="options-row">
                    <div className="toggle-container">
                        <input
                            type="checkbox"
                            id="idk-mode"
                            checked={idkMode}
                            onChange={e => setIdkMode(e.target.checked)}
                        />
                        <label htmlFor="idk-mode">Enable I don't know mode</label>
                    </div>
                    <div className="slider-container">
                        <label>Context chunks</label>
                        <input
                            type="range"
                            min={2}
                            max={12}
                            value={topK}
                            onChange={e => setTopK(parseInt(e.target.value, 10))}
                        />
                        <span className="slider-value">{topK}</span>
                    </div>
                    <div className="slider-container">
                        <label>Creativity</label>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={temperature}
                            onChange={e => setTemperature(parseFloat(e.target.value))}
                        />
                        <span className="slider-value">{temperature}</span>
                    </div>
                </div>
            </div>
            {answer && (
                <div className="card answer-card">
                    <div className="answer-title">Answer</div>
                    <div className="answer-body">{answer}</div>
                    {sources?.length ? (
                        <>
                            <hr className="answer-divider" />
                            <div className="sources-container">
                                <div className="sources-title">Sources</div>
                                <ul>
                                    {sources.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                        </>
                    ) : null}
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="card suggestions-card">
                    <b>You might also ask:</b>
                    <div className="suggestion-pills">
                        {suggestions.map((s, i) => <span key={i} className="pill" onClick={() => setQuery(s)}>{s}</span>)}
                    </div>
                </div>
            )}
        </div>
    );
};

// The main App component now handles the routing
export const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState('main');

    const renderPage = () => {
        switch (currentPage) {
            case 'main':
                return <MainContent />;
            case 'upload':
                return <UploadSources />;
            case 'analytics':
                return <AnalyticsDashboard />;
            case 'settings':
                return <Settings />;
            default:
                return <MainContent />;
        }
    };

    return (
        <div className="main-container">
            {/* Sidebar Section */}
            <div className="sidebar">
                <div className="askmate-logo">AskMate</div>
                <div className="sidebar-nav">
                    <ul>
                        <li><a href="#" onClick={() => setCurrentPage('main')}>🏠 Main</a></li>
                        <li><a href="#" onClick={() => setCurrentPage('upload')}>📚 Upload & Sources</a></li>
                        <li><a href="#" onClick={() => setCurrentPage('analytics')}>📊 Analytics</a></li>
                        <li><a href="#" onClick={() => setCurrentPage('settings')}>⚙️ Settings</a></li>
                    </ul>
                </div>
                <hr className="divider" />
                <div className="shortcuts">
                    <h3>Shortcuts</h3>
                    <ul>
                        <li>- Upload docs in 'Upload & Sources' page</li>
                        <li>- View usage in 'Analytics' page</li>
                    </ul>
                </div>
            </div>

            {/* Main Content Area Wrapper */}
            <div className="main-content-wrapper">
                {renderPage()}
            </div>
        </div>
    );
};
