# AskMate – React + Node.js

## Stack
- Backend: Node.js (TypeScript, Express), in-memory vector store, OpenAI/Gemini (optional)
- Frontend: React (Vite + TS), gradient UI, voice button, suggestions

## Setup
1) Backend
```bash
cd node-backend
cp .env.example .env
# Fill keys in .env (OPENAI_API_KEY/GEMINI_API_KEY optional)
npm install
npm run dev
# Server on http://localhost:4000
```

2) Frontend
```bash
cd react-frontend
# Point frontend to backend if needed (default http://localhost:4000):
# echo "VITE_API_BASE=http://localhost:4000" > .env
npm install
npm run dev
# App on http://localhost:5173
```

## Features
- /api/ask for Q&A + sources + I-Don’t-Know mode
- /api/ingest/pdf for PDF upload
- /api/ingest/notion & /api/ingest/google (optional keys)
- Analytics endpoints: summary/top-questions/top-sources/unanswered

## Notes
- Without API keys, the app uses hash-embeddings and returns a fallback message for generation.
- You can swap to OpenAI/Gemini by setting keys in backend .env.