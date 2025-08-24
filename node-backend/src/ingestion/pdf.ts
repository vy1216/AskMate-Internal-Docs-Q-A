import pdf from 'pdf-parse';
import { VectorStore } from '../vectorStore';

function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    chunks.push(text.slice(start, end));
    start = Math.max(0, end - overlap);
  }
  return chunks.map(c => c.trim()).filter(Boolean);
}

export async function ingestPdf(fileBuffer: Buffer, filename: string, store: VectorStore): Promise<number> {
  const data = await pdf(fileBuffer);
  const content = data.text || '';
  const chunks = chunkText(content);
  const metas = chunks.map(() => ({ source: filename, type: 'pdf' }));
  return store.addTexts(chunks, metas);
}