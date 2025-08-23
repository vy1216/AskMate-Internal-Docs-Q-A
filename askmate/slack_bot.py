import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from dotenv import load_dotenv

from askmate.config import AppConfig
from askmate.store import get_or_create_vector_store
from askmate.rag import answer_question
from askmate.analytics import AnalyticsClient

load_dotenv()

config = AppConfig.from_env()
analytics = AnalyticsClient(config.database_url)
vector_store = get_or_create_vector_store(config)

slack_app = App(token=os.getenv("SLACK_BOT_TOKEN"), signing_secret=os.getenv("SLACK_SIGNING_SECRET"))


@slack_app.command("/askmate")
def handle_askmate(ack, body, respond):
    ack()
    text = body.get("text", "").strip()
    if not text:
        respond("Usage: /askmate <your question>")
        return
    resp = answer_question(query=text, vector_store=vector_store, config=config, idk_mode=True, top_k=6, temperature=0.2, channel="slack")
    analytics.log_query(question=text, has_answer=resp.get("from_docs", False), sources=resp.get("sources", []), channel="slack")
    answer = resp.get("answer", "")
    sources = resp.get("sources", [])
    if sources:
        answer += "\n\nSources:\n" + "\n".join([f"- {s}" for s in sources])
    respond(answer)


if __name__ == "__main__":
    app_token = os.getenv("SLACK_APP_TOKEN")
    if not app_token:
        raise RuntimeError("SLACK_APP_TOKEN not set")
    SocketModeHandler(slack_app, app_token).start()