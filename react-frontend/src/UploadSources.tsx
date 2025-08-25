import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const UploadSources: React.FC = () => {
    const [pdfFiles, setPdfFiles] = useState<FileList | null>(null);
    const [notionDbId, setNotionDbId] = useState('');
    const [googleFileIds, setGoogleFileIds] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePdfUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pdfFiles || pdfFiles.length === 0) {
            setStatus('Please select at least one PDF file.');
            return;
        }

        setLoading(true);
        setStatus('Indexing PDFs...');
        
        const formData = new FormData();
        for (let i = 0; i < pdfFiles.length; i++) {
            // The key 'files' must match what the backend's multer expects
            formData.append('files', pdfFiles[i]);
        }

        try {
            const response = await axios.post(`${API_BASE}/api/ingest/pdf`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setStatus(`Indexed ${response.data.chunks} chunks from ${pdfFiles.length} PDF(s).`);
        } catch (error: any) {
            setStatus(`Error indexing PDFs: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNotionSync = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Syncing Notion...');
        try {
            const response = await axios.post(`${API_BASE}/api/ingest/notion`, { databaseId: notionDbId });
            setStatus(`Indexed ${response.data.chunks} chunks from Notion.`);
        } catch (error: any) {
            setStatus(`Error syncing Notion: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleDocsSync = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Syncing Google Docs...');
        try {
            const fileIdsArray = googleFileIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
            const response = await axios.post(`${API_BASE}/api/ingest/google`, { fileIds: fileIdsArray });
            setStatus(`Indexed ${response.data.chunks} chunks from Google Docs.`);
        } catch (error: any) {
            setStatus(`Error syncing Google Docs: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <h1>📚 Upload & Sources</h1>
            
            {status && (
                <div className="status-message">
                    {loading ? 'Processing...' : status}
                </div>
            )}

            {/* PDF Upload Section */}
            <div className="card expander-card">
                <h2>Upload PDFs</h2>
                <form onSubmit={handlePdfUpload}>
                    <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={(e) => setPdfFiles(e.target.files)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Indexing...' : 'Index PDFs'}
                    </button>
                </form>
            </div>

            {/* Notion Section */}
            <div className="card expander-card">
                <h2>Import from Notion</h2>
                <form onSubmit={handleNotionSync}>
                    <input
                        type="text"
                        placeholder="Notion Database ID"
                        value={notionDbId}
                        onChange={(e) => setNotionDbId(e.target.value)}
                        className="input"
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Syncing...' : 'Fetch & Index Notion'}
                    </button>
                </form>
            </div>

            {/* Google Docs Section */}
            <div className="card expander-card">
                <h2>Import Google Docs</h2>
                <form onSubmit={handleGoogleDocsSync}>
                    <textarea
                        placeholder="Google Docs File IDs (comma-separated)"
                        value={googleFileIds}
                        onChange={(e) => setGoogleFileIds(e.target.value)}
                        className="input"
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Syncing...' : 'Fetch & Index Google Docs'}
                    </button>
                </form>
            </div>

            <div className="info-message">
                All content is stored locally in your Chroma vector store.
            </div>
        </div>
    );
};

export default UploadSources;
