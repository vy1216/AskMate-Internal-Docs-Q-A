import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; // Use the same CSS

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

interface AnalyticsData {
    total: number;
    answered: number;
    unanswered: number;
    top_questions: [string, number][];
    top_sources: [string, number][];
    unanswered_recommended_faqs: [string, number][];
}

export const AnalyticsDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_BASE}/api/analytics`);
                setData(response.data);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="loading-message">Loading analytics...</div>;
    }

    if (!data) {
        return <div className="error-message">Failed to load analytics data.</div>;
    }

    return (
        <div className="page-container">
            <h1>📊 Insights Dashboard</h1>
            <div className="metrics-container">
                <div className="metric-card">
                    <div className="metric-value">{data.total}</div>
                    <div className="metric-label">Total Questions</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{data.answered}</div>
                    <div className="metric-label">Answered from Docs</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{data.unanswered}</div>
                    <div className="metric-label">Unanswered (flagged)</div>
                </div>
            </div>
            <div className="card list-card">
                <h2>Top Questions (7d)</h2>
                <ul>
                    {data.top_questions.map(([q, n], i) => (
                        <li key={i}>{q} — **{n}**</li>
                    ))}
                </ul>
            </div>
            <div className="card list-card">
                <h2>Most Referenced Sources (7d)</h2>
                <ul>
                    {data.top_sources.map(([s, n], i) => (
                        <li key={i}>{s} — **{n}**</li>
                    ))}
                </ul>
            </div>
            <div className="card list-card">
                <h2>Unanswered → Recommend FAQs</h2>
                <ul>
                    {data.unanswered_recommended_faqs.map(([q, n], i) => (
                        <li key={i}>{q} — **{n}**</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;