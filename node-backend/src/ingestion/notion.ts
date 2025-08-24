import { Client } from '@notionhq/client';
import { VectorStore } from '../vectorStore';

function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) { const end = Math.min(text.length, start + chunkSize); chunks.push(text.slice(start, end)); start = Math.max(0, end - overlap); }
  return chunks.map(c => c.trim()).filter(Boolean);
}

export async function ingestNotion(databaseId: string | undefined, store: VectorStore, apiKey: string): Promise<number> {
  const notion = new Client({ auth: apiKey });
  let pages: any[] = [];
  if (databaseId) {
    const q = await notion.databases.query({ database_id: databaseId });
    pages = q.results as any[];
  } else {
    const s = await notion.search({ page_size: 10 });
    pages = s.results as any[];
  }
  let total = 0;
  for (const page of pages) {
    const pageId = page.id;
    const props = (page as any).properties || {};
    const name = (props.Name?.title || []).map((t: any) => t.plain_text).join(' ');
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const texts: string[] = [];
    for (const b of blocks.results as any[]) {
      const t = (b[b.type]?.rich_text || []).map((rt: any) => rt.plain_text).join(' ');
      if (t) texts.push(t);
    }
    const content = (name + '\n' + texts.join('\n')).trim();
    const chunks = chunkText(content);
    const metas = chunks.map(() => ({ source: `Notion:${name}`, type: 'notion' }));
    total += await store.addTexts(chunks, metas);
  }
  return total;
}