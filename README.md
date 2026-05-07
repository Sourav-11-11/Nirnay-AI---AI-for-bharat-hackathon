# Nirnay AI Backend MVP

Simple FastAPI backend for a hackathon demo that converts court judgment PDFs into structured, verifiable actions.

## What this prototype includes

- PDF upload and local storage
- Deterministic extraction (2-3 action directions) from PDF text
- Highlight mapping (page number + exact source snippet)
- Verification/edit flow with original vs edited tracking
- Final actions API for frontend consumption
- Local SQLite storage (`data/nirnay.db`)

## Project structure

```text
app/
  main.py                # FastAPI routes and request flow
  database.py            # SQLite schema + CRUD helpers
  schemas.py             # Pydantic request/response models
  services/
    extractor.py         # Deterministic extraction + mock fallback
requirements.txt
```

## Run locally

1. Create and activate a Python environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start server:

```bash
uvicorn app.main:app --reload
```

4. Open API docs:

- http://127.0.0.1:8000/docs

## API flow for demo

1. `POST /api/upload`
   - Upload a PDF and get `document_id`.

2. `POST /api/extract/{document_id}`
   - Runs deterministic extraction and stores results.
   - Returns items with:
     - `direction`
     - `department`
     - `deadline`
     - `confidence`
     - `source_snippet`
     - `page_number`

Alternative single-step endpoint:
- `POST /api/extract` (upload + extract in one request)

3. `PUT /api/verify/{item_id}`
   - Edit one or more fields (`direction`, `department`, `deadline`)
   - Stores edited values and status (`approved` or `edited`)
   - Returns original vs edited values per field

4. `GET /api/actions/{document_id}`
   - Returns final verified action list for the document

## Notes about extraction

- Uses PyMuPDF (`fitz`) to read text lines from each page.
- Picks lines with legal-action style keywords (`shall`, `directed`, `within`, etc.).
- Infers department/deadline using simple keyword and regex logic.
- Falls back to deterministic mock extraction data if text is sparse.

This keeps behavior predictable and demo-safe while still showing an end-to-end pipeline.
"# Nirnay-AI---AI-for-bharat-hackathon" 
