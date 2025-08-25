import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// This is the correct type definition for a better-sqlite3 Database instance
type SQLiteDatabase = Database.Database;

export class Analytics {
  private db: SQLiteDatabase;

  constructor(private dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        has_answer INTEGER NOT NULL,
        sources TEXT,
        channel TEXT,
        created_at INTEGER NOT NULL
      )
    `).run();
  }

  logQuery(question: string, hasAnswer: boolean, sources: string[], channel: string) {
    const serializedSources = sources.join(',');
    this.db.prepare(
      'INSERT INTO queries (question, has_answer, sources, channel, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(question, hasAnswer ? 1 : 0, serializedSources, channel, Date.now());
  }

  countQueries(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM queries').get() as { c: number } | undefined;
    return row?.c || 0;
  }

  countAnswered(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM queries WHERE has_answer=1').get() as { c: number } | undefined;
    return row?.c || 0;
  }

  countUnanswered(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM queries WHERE has_answer=0').get() as { c: number } | undefined;
    return row?.c || 0;
  }

  topQuestions(days = 7, limit = 5): { q: string; n: number }[] {
    const since = Date.now() - days * 86400000;
    const rows = this.db.prepare(
      'SELECT question as q, COUNT(*) as n FROM queries WHERE created_at >= ? GROUP BY question ORDER BY n DESC LIMIT ?'
    ).all(since, limit) as { q: string; n: number }[];
    return rows;
  }

  topSources(days = 7, limit = 5): { s: string; n: number }[] {
    const since = Date.now() - days * 86400000;
    const rows = this.db.prepare(
      'SELECT sources FROM queries WHERE created_at >= ? AND sources IS NOT NULL AND sources != ""'
    ).all(since) as { sources: string }[];
    const counts: Record<string, number> = {};
    for (const r of rows) {
      r.sources
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(s => (counts[s] = (counts[s] || 0) + 1));
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([s, n]) => ({ s, n }));
  }

  unanswered(days = 30, limit = 10): { q: string; n: number }[] {
    const since = Date.now() - days * 86400000;
    const rows = this.db.prepare(
      'SELECT question as q, COUNT(*) as n FROM queries WHERE created_at >= ? AND has_answer=0 GROUP BY question ORDER BY n DESC LIMIT ?'
    ).all(since, limit) as { q: string; n: number }[];
    return rows;
  }
}
