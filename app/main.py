import os
import io
import base64
import streamlit as st
from streamlit_mic_recorder import mic_recorder
from dotenv import load_dotenv

from askmate.config import AppConfig
from askmate.embeddings import get_embeddings_provider
from askmate.store import get_or_create_vector_store
from askmate.rag import answer_question
from askmate.analytics import AnalyticsClient
from askmate.suggestions import suggest_related_questions
from askmate.utils import transcribe_with_openai

load_dotenv()

st.set_page_config(page_title="AskMate – AI Knowledge Buddy", page_icon="🧠", layout="wide")

# Inject custom CSS
with open(os.path.join(os.path.dirname(__file__), "styles.css"), "r") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# App state
if "config" not in st.session_state:
    st.session_state.config = AppConfig.from_env()
if "analytics" not in st.session_state:
    st.session_state.analytics = AnalyticsClient(st.session_state.config.database_url)
if "vector_store" not in st.session_state:
    st.session_state.vector_store = get_or_create_vector_store(st.session_state.config)

config = st.session_state.config
analytics = st.session_state.analytics
vector_store = st.session_state.vector_store

# Header / Hero
col1, col2 = st.columns([5, 3])
with col1:
    st.markdown("""
    <div class="hero">
      <div class="badge">AskMate</div>
      <h1 class="title">Your AI Knowledge Buddy</h1>
      <p class="subtitle">Ask anything about your docs. Get answers with sources, voice or text. Smart suggestions included.</p>
    </div>
    """, unsafe_allow_html=True)
with col2:
    st.markdown("""
    <div class="hero-card">
      <div class="metric">
        <div class="metric-value">⚡</div>
        <div class="metric-label">Instant Answers</div>
      </div>
      <div class="metric">
        <div class="metric-value">🧩</div>
        <div class="metric-label">Smart Suggestions</div>
      </div>
      <div class="metric">
        <div class="metric-value">🔈</div>
        <div class="metric-label">Voice Search</div>
      </div>
    </div>
    """, unsafe_allow_html=True)

# Query input section
st.markdown("<div class='card'>", unsafe_allow_html=True)
qcol1, qcol2, qcol3 = st.columns([6, 1, 1])
with qcol1:
    query = st.text_input("Ask a question", placeholder="What’s our refund policy?", label_visibility="collapsed", key="query_input")
with qcol2:
    st.write(" ")
    st.write(" ")
    audio = mic_recorder(start_prompt="🎙️ Voice", stop_prompt="Stop", key="recorder")
with qcol3:
    use_docs = st.toggle("Use docs", value=True, help="If off, answer from general knowledge only")

transcribed_text = None
if audio and isinstance(audio, dict) and audio.get("bytes"):
    audio_bytes = base64.b64decode(audio["bytes"]) if isinstance(audio["bytes"], str) else audio["bytes"]
    try:
        transcribed_text = transcribe_with_openai(audio_bytes)
        if transcribed_text:
            st.session_state.query_input = transcribed_text
            query = transcribed_text
            st.toast("Transcribed voice input", icon="🎧")
    except Exception as e:
        st.warning(f"Voice transcription failed: {e}")

submit = st.button("Ask", use_container_width=True, type="primary")

st.markdown("</div>", unsafe_allow_html=True)

# Options row
opt1, opt2, opt3 = st.columns([3,3,3])
with opt1:
    idk_mode = st.toggle("Enable I don't know mode", value=True, help="If true, the assistant will flag missing FAQs when docs lack answers.")
with opt2:
    max_chunks = st.slider("Context chunks", 2, 12, 6)
with opt3:
    temperature = st.slider("Creativity", 0.0, 1.0, 0.2)

# Results
if submit and query:
    with st.spinner("Thinking..."):
        response = answer_question(
            query=query,
            vector_store=vector_store,
            config=config,
            idk_mode=idk_mode,
            top_k=max_chunks,
            temperature=temperature,
            channel="web",
        )
        analytics.log_query(question=query, has_answer=response.get("from_docs", False), sources=response.get("sources", []), channel="web")
    # Answer card
    st.markdown("<div class='answer-card'>", unsafe_allow_html=True)
    st.markdown(f"<div class='answer-title'>Answer</div>", unsafe_allow_html=True)
    st.write(response.get("answer", ""))
    sources = response.get("sources", [])
    if sources:
        st.markdown("---")
        st.caption("Sources")
        for s in sources:
            st.write(f"- {s}")
    st.markdown("</div>", unsafe_allow_html=True)

    # Suggestions
    suggestions = suggest_related_questions(query=query, vector_store=vector_store, analytics=analytics, config=config)
    if suggestions:
        st.markdown("<div class='suggestions'>", unsafe_allow_html=True)
        st.markdown("**You might also ask:**")
        st.write(", ".join([f"`{s}`" for s in suggestions]))
        st.markdown("</div>", unsafe_allow_html=True)

st.sidebar.header("Shortcuts")
st.sidebar.markdown("- Upload docs in 'Upload & Sources' page")
st.sidebar.markdown("- View usage in 'Analytics' page")