import crypto from 'crypto';
import { config } from './config';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmbeddingsProvider {
  embedTexts(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export function createEmbeddings(): EmbeddingsProvider {
  const provider = config.embeddingProvider;
  if (provider === 'openai' && config.openaiApiKey) return new OpenAIEmbeddings();
  if (provider === 'gemini' && config.geminiApiKey) return new GeminiEmbeddings();
  return new HashEmbeddings();
}

class OpenAIEmbeddings implements EmbeddingsProvider {
  client = new OpenAI({ apiKey: config.openaiApiKey });
  model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  async embedTexts(texts: string[]): Promise<number[][]> {
    const resp = await this.client.embeddings.create({ model: this.model, input: texts });
    return resp.data.map(d => d.embedding as unknown as number[]);
  }
  async embedQuery(text: string): Promise<number[]> { return (await this.embedTexts([text]))[0]; }
}

class GeminiEmbeddings implements EmbeddingsProvider {
  genai = new GoogleGenerativeAI(config.geminiApiKey);
  model = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  async embedTexts(texts: string[]): Promise<number[][]> {
    const model = this.genai.getGenerativeModel({ model: this.model });
    const out: number[][] = [];
    for (const t of texts) {
      const r = await model.embedContent(t as any);
      out.push((r.embedding?.values || []) as number[]);
    }
    return out;
  }
  async embedQuery(text: string): Promise<number[]> { return (await this.embedTexts([text]))[0]; }
}

class HashEmbeddings implements EmbeddingsProvider {
  constructor(private dim: number = 512) {}
  async embedTexts(texts: string[]): Promise<number[][]> {
    return texts.map(t => this.hashVec(t));
  }
  async embedQuery(text: string): Promise<number[]> { return this.hashVec(text); }
  private hashVec(text: string): number[] {
    const v = new Array(this.dim).fill(0);
    for (const tok of text.toLowerCase().split(/\s+/g)) {
      const h = crypto.createHash('md5').update(tok).digest();
      const idx = h[0] % this.dim;
      const sign = (h[1] & 1) ? -1 : 1;
      v[idx] += sign;
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map(x => x / norm);
  }
}