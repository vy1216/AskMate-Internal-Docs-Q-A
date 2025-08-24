import streamlit as st
from askmate.analytics import AnalyticsClient
from askmate.config import AppConfig

if "config" not in st.session_state:
    st.session_state.config = AppConfig.from_env()
if "analytics" not in st.session_state:
    st.session_state.analytics = AnalyticsClient(st.session_state.config.database_url)

analytics = st.session_state.analytics

st.set_page_config(page_title="Analytics", page_icon="📊", layout="wide")

st.title("📊 Insights Dashboard")

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("Total Questions", analytics.count_queries())
with col2:
    st.metric("Answered from Docs", analytics.count_answered())
with col3:
    st.metric("Unanswered (flagged)", analytics.count_unanswered())

st.subheader("Top Questions (7d)")
for q, n in analytics.top_questions(days=7, limit=5):
    st.write(f"- {q} — {n}")

st.subheader("Most Referenced Sources (7d)")
for s, n in analytics.top_sources(days=7, limit=5):
    st.write(f"- {s} — {n}")

st.subheader("Unanswered → Recommend FAQs")
for q, n in analytics.unanswered(days=30, limit=10):
    st.write(f"- {q} — {n}")