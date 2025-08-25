import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config as typedConfig } from './config.js';
import { VectorStore } from './vectorStore.js';
import { answerQuestion } from './rag.js';
import { ingestPdf } from './ingestion/pdf.js';
import { ingestNotion } from './ingestion/notion.js';
import { ingestGoogleDocs } from './ingestion/google.js';
import { Analytics } from './analytics.js';

const app = express();

app.use(cors({ origin: typedConfig.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

const upload = multer({ dest: 'uploads/' });

const store = new VectorStore(typedConfig.vectorstorePersist);
const analytics = new Analytics(typedConfig.sqliteDb);

console.log('=== AskMate backend config ===');
console.log({
  port: typedConfig.port,
  llmProvider: typedConfig.llmProvider,
  embeddingProvider: typedConfig.embeddingProvider,
  vectorstore: typedConfig.vectorstorePersist,
  sqliteDb: typedConfig.sqliteDb,
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/ask', async (req, res) => {
  try {
    const { query, idkMode = true, topK = 6, temperature = 0.2, channel = 'web' } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
    const r = await answerQuestion({ query, store, idkMode, topK, temperature });
    analytics.logQuery(query, r.fromDocs, r.sources, channel);
    res.json(r);
  } catch (e: any) {
    console.error('ASK error:', e);
    res.status(500).json({ error: e?.message || 'Server error' });
  }
});

app.post('/api/ingest/pdf', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as any[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let total = 0;
    for (const f of files) {
      const filePath = path.resolve(f.path);
      const data = fs.readFileSync(filePath);
      total += await ingestPdf(data, f.originalname, store);
      fs.unlinkSync(filePath);
    }
    res.json({ ok: true, chunks: total });
  } catch (e: any) {
    console.error('PDF ingest error:', e);
    res.status(500).json({ error: e?.message || 'Ingest failed' });
  }
});

app.post('/api/ingest/notion', async (req, res) => {
  try {
    const { databaseId } = req.body || {};
    if (!process.env.NOTION_API_KEY) return res.status(400).json({ error: 'NOTION_API_KEY not set' });
    const count = await ingestNotion(databaseId, store, process.env.NOTION_API_KEY);
    res.json({ ok: true, chunks: count });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Notion ingest failed' });
  }
});

app.post('/api/ingest/google', async (req, res) => {
  try {
    const { fileIds } = req.body || {};
    if (!Array.isArray(fileIds)) return res.status(400).json({ error: 'fileIds must be array' });
    if (!typedConfig.googleClientSecretFile) return res.status(400).json({ error: 'GOOGLE_CLIENT_SECRET_FILE not set' });
    const count = await ingestGoogleDocs(fileIds, store, typedConfig.googleClientSecretFile);
    res.json({ ok: true, chunks: count });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Google ingest failed' });
  }
});

app.get('/api/analytics', async (_req, res) => {
  try {
    const total_questions = analytics.countQueries();
    const answered_from_docs = analytics.countAnswered();
    const unanswered_flagged = analytics.countUnanswered();
    const top_questions = analytics.topQuestions();
    const top_sources = analytics.topSources();
    const unanswered_recommended_faqs = analytics.unanswered();

    res.json({
      total_questions: total_questions,
      answered_from_docs: answered_from_docs,
      unanswered_flagged: unanswered_flagged,
      top_questions: top_questions,
      top_sources: top_sources,
      unanswered_recommended_faqs: unanswered_recommended_faqs,
    });
  } catch (e: any) {
    console.error('Failed to fetch analytics data:', e);
    res.status(500).json({ error: 'Failed to fetch analytics data.' });
  }
});


app.get('/api/settings', (_req, res) => {
  try {
    res.json({
      embedding_provider: typedConfig.embeddingProvider,
      vectorstore_dir: typedConfig.vectorstorePersist,
      llm_provider: typedConfig.llmProvider,
      database_url: typedConfig.sqliteDb,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to fetch settings' });
  }
});

app.listen(typedConfig.port, () => {
  console.log(`AskMate backend listening on :${typedConfig.port}`);
});
