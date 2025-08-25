import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css'; // Use the same CSS

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

interface SettingsData {
  embedding_provider: string;
  vectorstore_dir: string;
  llm_provider: string;
  database_url: string;
}

export const Settings: React.FC = () => {
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get(`${API_BASE}/api/settings`);
                setSettings(response.data);
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    if (loading) {
        return <div className="loading-message">Loading settings...</div>;
    }

    if (!settings) {
        return <div className="error-message">Failed to load settings.</div>;
    }

    return (
        <div className="page-container">
            <h1>⚙️ Settings</h1>
            <div className="card">
                <h2>Model Providers</h2>
                <div className="code-block">
                    <p><strong>Embeddings:</strong> {settings.embedding_provider}</p>
                    <p><strong>Vector store:</strong> {settings.vectorstore_dir}</p>
                    <p><strong>LLM:</strong> {settings.llm_provider}</p>
                    <p><strong>DB:</strong> {settings.database_url}</p>
                </div>
                <div className="caption">
                    Set values via environment variables in your .env file.
                </div>
            </div>
        </div>
    );
};

export default Settings;