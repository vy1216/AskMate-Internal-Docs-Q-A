import { google } from 'googleapis';
import { VectorStore } from '../vectorStore';

function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) { const end = Math.min(text.length, start + chunkSize); chunks.push(text.slice(start, end)); start = Math.max(0, end - overlap); }
  return chunks.map(c => c.trim()).filter(Boolean);
}

export async function ingestGoogleDocs(fileIds: string[], store: VectorStore, credentialsPath: string): Promise<number> {
  const auth = new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes: ['https://www.googleapis.com/auth/documents.readonly'] });
  const docs = google.docs({ version: 'v1', auth });
  let total = 0;
  for (const id of fileIds) {
    const r = await docs.documents.get({ documentId: id });
    const title = r.data.title || id;
    const content = (r.data.body?.content || []) as any[];
    const texts: string[] = [];
    for (const e of content) {
      const p = (e as any).paragraph; if (!p) continue;
      for (const pe of (p.elements || [])) {
        const t = pe.textRun?.content; if (t) texts.push(t);
      }
    }
    const combined = (title + '\n' + texts.join('')).trim();
    const chunks = chunkText(combined);
    const metas = chunks.map(() => ({ source: `GoogleDoc:${title}`, type: 'google_doc' }));
    total += await store.addTexts(chunks, metas);
  }
  return total;
}