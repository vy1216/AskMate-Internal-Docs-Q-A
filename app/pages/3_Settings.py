import os
import streamlit as st
from askmate.config import AppConfig

if "config" not in st.session_state:
    st.session_state.config = AppConfig.from_env()
config = st.session_state.config

st.set_page_config(page_title="Settings", page_icon="⚙️", layout="wide")

st.title("⚙️ Settings")

st.write("Model Providers")
col1, col2 = st.columns(2)
with col1:
    st.code(f"Embeddings: {config.embedding_provider}")
    st.code(f"Vector store: {config.vectorstore_dir}")
with col2:
    st.code(f"LLM: {config.llm_provider}")
    st.code(f"DB: {config.database_url}")

st.caption("Set values via environment variables in your .env file.")