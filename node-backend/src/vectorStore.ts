import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createEmbeddings } from './embeddings.js'; // ✅ keep .js since it's a local file

export interface DocRecord {
  id: string;
  text: string;
  metadata: Record<string, any>;
  embedding: number[];
}

export class VectorStore {
  private docs: DocRecord[] = [];

  constructor(private persistDir: string) {
    if (!fs.existsSync(persistDir)) {
      fs.mkdirSync(persistDir, { recursive: true });
    }
    this.load();
  }

  private persistPath(): string {
    return path.join(this.persistDir, 'store.json');
  }

  private save(): void {
    fs.writeFileSync(this.persistPath(), JSON.stringify(this.docs, null, 2));
  }

  private load(): void {
    try {
      const p = this.persistPath();
      if (fs.existsSync(p)) {
        this.docs = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch (err) {
      console.error("Failed to load persisted docs:", err);
    }
  }

  async addTexts(texts: string[], metadatas: Record<string, any>[]): Promise<number> {
    const embeddings = await createEmbeddings().embedTexts(texts);
    const newDocs: DocRecord[] = texts.map((t, i) => ({
      id: uuidv4(),
      text: t,
      metadata: metadatas[i] || {},
      embedding: embeddings[i]
    }));
    this.docs.push(...newDocs);
    this.save();
    return newDocs.length;
  }

  async similaritySearch(query: string, k = 6): Promise<DocRecord[]> {
    const q = await createEmbeddings().embedQuery(query);
    const scored = this.docs
      .map(d => ({ score: cosine(q, d.embedding), d }))
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(s => s.d);
  }
}

export function cosine(a: number[], b: number[]): number {
  let s = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    s += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return s / ((Math.sqrt(na) || 1) * (Math.sqrt(nb) || 1));
}
