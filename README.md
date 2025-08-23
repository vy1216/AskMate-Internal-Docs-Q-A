# AskMate – Your AI Knowledge Buddy

AskMate is a multi-channel AI knowledge buddy that answers questions from your team docs, suggests related info, learns gaps, and works on Web + Slack. It includes voice search, proactive suggestions, and an analytics dashboard.

## Features
- Streamlit web app (beautiful multi-page UI)
- Voice search (microphone) with transcription
- RAG over your docs (PDF, Notion export, Google Docs)
- "I don't know" mode to flag missing FAQs
- Smart related-question suggestions
- Analytics dashboard (top questions, unanswered)
- Slack bot (/askmate)
- OpenAI or Gemini models; Chroma vector store

## Quickstart
1. Clone repo and enter workspace
2. Create `.env` from `.env.example` and fill API keys
3. Install deps:
```bash
pip install -r requirements.txt
```
4. Run the app:
```bash
streamlit run app/main.py
```

## Slack Bot (optional)
- Create a Slack app with commands and Socket Mode
- Set `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`
- Run:
```bash
python askmate/slack_bot.py
```

## Google Docs & Notion (optional)
- Notion: set `NOTION_API_KEY` and (optionally) `NOTION_DATABASE_ID`
- Google: create OAuth credentials JSON and set `GOOGLE_CLIENT_SECRET_FILE`

## Storage
- Vector store at `VECTORSTORE_DIR`
- Analytics SQLite at `DATABASE_URL`

## Notes
- If embeddings provider is not set or API keys missing, app will fall back to local embeddings.