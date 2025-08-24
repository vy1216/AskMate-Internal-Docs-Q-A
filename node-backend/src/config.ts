import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  embeddingProvider: (process.env.EMBEDDING_PROVIDER || 'openai').toLowerCase(),
  vectorstorePersist: process.env.VECTORSTORE_PERSIST || path.join(process.cwd(), 'storage'),
  sqliteDb: process.env.SQLITE_DB || path.join(process.cwd(), 'storage', 'analytics.db'),
  notionApiKey: process.env.NOTION_API_KEY || '',
  notionDatabaseId: process.env.NOTION_DATABASE_ID || '',
  googleClientSecretFile: process.env.GOOGLE_CLIENT_SECRET_FILE || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};