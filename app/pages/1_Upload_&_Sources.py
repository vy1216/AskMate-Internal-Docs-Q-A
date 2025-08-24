import os
import streamlit as st
from dotenv import load_dotenv
from askmate.config import AppConfig
from askmate.store import get_or_create_vector_store
from askmate.ingestion.pdf import ingest_pdf
from askmate.ingestion.notion import ingest_notion_pages
from askmate.ingestion.google import ingest_google_docs

load_dotenv()

st.set_page_config(page_title="Upload & Sources", page_icon="📚", layout="wide")

if "config" not in st.session_state:
    st.session_state.config = AppConfig.from_env()
if "vector_store" not in st.session_state:
    st.session_state.vector_store = get_or_create_vector_store(st.session_state.config)

config = st.session_state.config
vector_store = st.session_state.vector_store

st.title("📚 Upload & Sources")

# PDF upload
with st.expander("Upload PDFs", expanded=True):
    files = st.file_uploader("Upload PDF files", type=["pdf"], accept_multiple_files=True)
    if st.button("Index PDFs", type="primary") and files:
        with st.spinner("Indexing PDFs..."):
            total = 0
            for f in files:
                total += ingest_pdf(f, vector_store)
        st.success(f"Indexed {total} chunks from {len(files)} PDF(s).")

# Notion
with st.expander("Import from Notion", expanded=False):
    notion_db_id = st.text_input("Notion Database ID", value=os.getenv("NOTION_DATABASE_ID", ""))
    if st.button("Fetch & Index Notion", disabled=not os.getenv("NOTION_API_KEY")):
        with st.spinner("Syncing Notion..."):
            count = ingest_notion_pages(notion_db_id, vector_store)
        st.success(f"Indexed {count} chunks from Notion.")

# Google Docs
with st.expander("Import Google Docs", expanded=False):
    google_file_ids = st.text_area("Google Docs File IDs (comma-separated)", value=os.getenv("GOOGLE_DOCS_FILE_IDS", ""))
    if st.button("Fetch & Index Google Docs", disabled=not os.getenv("GOOGLE_CLIENT_SECRET_FILE")):
        ids = [i.strip() for i in google_file_ids.split(",") if i.strip()]
        with st.spinner("Syncing Google Docs..."):
            count = ingest_google_docs(ids, vector_store)
        st.success(f"Indexed {count} chunks from Google Docs.")

st.info("All content is stored locally in your Chroma vector store.")