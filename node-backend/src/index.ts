import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config } from './config.js';
import { VectorStore } from './vectorStore.js';
import { answerQuestion } from './rag.js';
import { ingestPdf } from './ingestion/pdf.js';
import { ingestNotion } from './ingestion/notion.js';
import { ingestGoogleDocs } from './ingestion/google.js';
import { Analytics } from './analytics.js';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

const upload = multer();
const store = new VectorStore(config.vectorstorePersist);
const analytics = new Analytics(config.sqliteDb);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/ask', async (req, res) => {
  try {
    const { query, idkMode = true, topK = 6, temperature = 0.2, channel = 'web' } = req.body || {};
    if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query required' });
    const r = await answerQuestion({ query, store, idkMode, topK, temperature });
    analytics.logQuery(query, r.fromDocs, r.sources, channel);
    res.json(r);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Server error' });
  }
});

app.post('/api/ingest/pdf', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    let total = 0;
    for (const f of files) total += await ingestPdf(f.buffer, f.originalname, store);
    res.json({ ok: true, chunks: total });
  } catch (e: any) {
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
    if (!config.googleClientSecretFile) return res.status(400).json({ error: 'GOOGLE_CLIENT_SECRET_FILE not set' });
    const count = await ingestGoogleDocs(fileIds, store, config.googleClientSecretFile);
    res.json({ ok: true, chunks: count });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Google ingest failed' });
  }
});

app.get('/api/analytics/summary', (_req, res) => {
  res.json({
    total: analytics.countQueries(),
    answered: analytics.countAnswered(),
    unanswered: analytics.countUnanswered(),
  });
});

app.get('/api/analytics/top-questions', (req, res) => {
  const days = parseInt((req.query.days as string) || '7', 10);
  const limit = parseInt((req.query.limit as string) || '5', 10);
  res.json(analytics.topQuestions(days, limit));
});

app.get('/api/analytics/top-sources', (req, res) => {
  const days = parseInt((req.query.days as string) || '7', 10);
  const limit = parseInt((req.query.limit as string) || '5', 10);
  res.json(analytics.topSources(days, limit));
});

app.get('/api/analytics/unanswered', (req, res) => {
  const days = parseInt((req.query.days as string) || '30', 10);
  const limit = parseInt((req.query.limit as string) || '10', 10);
  res.json(analytics.unanswered(days, limit));
});

app.listen(config.port, () => {
  console.log(`AskMate backend listening on :${config.port}`);
});