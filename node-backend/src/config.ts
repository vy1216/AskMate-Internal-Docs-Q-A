import dotenv from 'dotenv';
import path from 'path';

dotenv.config();


const norm = (p?: string) =>
  p ? path.resolve(p) : p;

export const config = {
  // server
  port: parseInt(process.env.PORT ?? '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  // providers
  llmProvider: (process.env.LLM_PROVIDER ?? 'gemini').toLowerCase(),
  embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? 'gemini').toLowerCase(),

  // keys (optional here; we validate at call time)
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',

  // storage
  vectorstorePersist: norm(process.env.VECTORSTORE_DIR) ?? path.join(process.cwd(), 'storage', 'chroma'),
  sqliteDb: norm(process.env.SQLITE_DB) ?? path.join(process.cwd(), 'storage', 'analytics.db'),

  // integrations
  notionApiKey: process.env.NOTION_API_KEY ?? '',
  notionDatabaseId: process.env.NOTION_DATABASE_ID ?? '',
  googleClientSecretFile: norm(process.env.GOOGLE_CLIENT_SECRET_FILE) ?? '',
};
