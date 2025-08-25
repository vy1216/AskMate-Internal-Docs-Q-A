import { VectorStore } from './vectorStore';

export async function answerQuestion(params: {
  query: string;
  store: VectorStore;
  idkMode: boolean;
  topK: number;
  temperature: number;
}): Promise<{
  answer: string;
  sources: string[];
  fromDocs: boolean;
  suggestFlag: boolean;
}> {
  const { query, store, idkMode, topK, temperature } = params;

  const chunks = await store.similaritySearch(query, topK);
  const fromDocs = chunks.length > 0;
  const context = chunks
    .map((c, i) => `[Source ${i + 1}] ${c.metadata?.source || ''}\n${c.text}`)
    .join('\n\n');

  if (idkMode && !fromDocs) {
    return {
      answer:
        "I couldn't find this in your docs. Do you want me to flag this as a missing FAQ?",
      sources: [],
      fromDocs: false,
      suggestFlag: true,
    };
  }

  const system =
    'You are AskMate, a precise and helpful AI knowledge buddy for teams. Prefer info from provided context. Cite sources by title/link.';
  const user = `Question: ${query}\n\nContext:\n${context}\n\nAnswer:`;

  const answer = await generate(system, user, temperature);

  const sources: string[] = [];
  for (const c of chunks) {
    const src = c.metadata?.source || c.metadata?.title || c.metadata?.url;
    if (src && !sources.includes(src)) sources.push(src);
  }

  return { answer, sources, fromDocs, suggestFlag: false };
}

async function generate(system: string, user: string, temperature: number): Promise<string> {
  const provider =
    (process.env.LLM_PROVIDER ||
      process.env.EMBEDDING_PROVIDER ||
      'gemini')
      .toLowerCase();

  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: key });
      const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
      const resp = await client.chat.completions.create({
        model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      return resp.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('OpenAI error:', err);
      throw new Error('OpenAI model call failed');
    }
  }

  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genai = new GoogleGenerativeAI(key);
      const modelName = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash';
      const model = genai.getGenerativeModel({ model: modelName });

      const r = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: system }, { text: user }],
          },
        ],
        generationConfig: { temperature },
      } as any);

      return r.response.text();
    } catch (err) {
      console.error('Gemini error:', err);
      throw new Error('Gemini model call failed');
    }
  }

  throw new Error(
    `Unsupported provider "${provider}". Set LLM_PROVIDER to "gemini" or "openai".`
  );
}
