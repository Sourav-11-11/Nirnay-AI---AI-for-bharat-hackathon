from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.database import (
    UPLOAD_DIR,
    get_document,
    get_extracted_item,
    get_extracted_items,
    init_db,
    insert_document,
    replace_extracted_items,
    update_extracted_item,
)
from app.schemas import (
    ActionsResponse,
    ExtractionResponse,
    FieldVerification,
    UploadResponse,
    VerificationResponse,
    VerificationUpdateRequest,
)
from app.services.extractor import enrich_verified_item, get_fallback_extractions, safe_extract_items_from_pdf

app = FastAPI(title="Nirnay AI API", version="0.1.0")
MAX_DEMO_FILE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://nirnay-ai.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def startup_event() -> None:
    # Initialize local folders and SQLite tables for a zero-config demo run.
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/pdf/{document_id}")
def get_pdf(document_id: str):
    """Serve PDF file for production environments."""
    document = get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    
    pdf_path = Path(document["stored_path"])
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=document["original_filename"]
    )


@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    document = await _save_uploaded_pdf(file)
    return UploadResponse(
        document_id=document["id"],
        filename=document["original_filename"],
    )


@app.post("/api/extract/{document_id}", response_model=ExtractionResponse)
def extract_from_uploaded_pdf(document_id: str) -> ExtractionResponse:
    document = get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    extracted_rows, fallback = _extract_and_store(document_id, Path(document["stored_path"]))
    return ExtractionResponse(
        document_id=document_id,
        items=[_to_item_payload(row) for row in extracted_rows],
        fallback=fallback,
    )


@app.post("/api/extract", response_model=ExtractionResponse)
async def extract_from_file(file: UploadFile = File(...)) -> ExtractionResponse:
    # This endpoint supports single-call demos: upload + extract in one request.
    document = await _save_uploaded_pdf(file)
    document_id = document["id"]
    extracted_rows, fallback = _extract_and_store(document_id, Path(document["stored_path"]))
    return ExtractionResponse(
        document_id=document_id,
        items=[_to_item_payload(row) for row in extracted_rows],
        fallback=fallback,
    )


@app.put("/api/verify/{item_id}", response_model=VerificationResponse)
def verify_item(item_id: str, payload: VerificationUpdateRequest) -> VerificationResponse:
    item = get_extracted_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Extracted item not found")

    new_direction = payload.direction if payload.direction is not None else item["direction"]
    new_department = payload.department if payload.department is not None else item["department"]
    new_deadline = payload.deadline if payload.deadline is not None else item["deadline"]

    is_edited = any(
        [
            new_direction != item["original_direction"],
            new_department != item["original_department"],
            new_deadline != item["original_deadline"],
        ]
    )
    new_status = payload.status or ("edited" if is_edited else "approved")

    updated_item = update_extracted_item(
        item_id=item_id,
        direction=new_direction,
        department=new_department,
        deadline=new_deadline,
        status=new_status,
    )
    if updated_item is None:
        raise HTTPException(status_code=500, detail="Failed to update extracted item")

    print(
        f"[Nirnay AI] Verification updated for item '{item_id}': "
        f"status={new_status}, direction_changed={item['original_direction'] != updated_item['direction']}, "
        f"department_changed={item['original_department'] != updated_item['department']}, "
        f"deadline_changed={item['original_deadline'] != updated_item['deadline']}"
    )

    return VerificationResponse(
        item_id=item_id,
        status=new_status,
        direction=_field_verification(
            original=item["original_direction"],
            edited=updated_item["direction"],
        ),
        department=_field_verification(
            original=item["original_department"],
            edited=updated_item["department"],
        ),
        deadline=_field_verification(
            original=item["original_deadline"],
            edited=updated_item["deadline"],
        ),
    )


@app.get("/api/actions/{document_id}", response_model=ActionsResponse)
def get_actions(document_id: str) -> ActionsResponse:
    document = get_document(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    extracted_rows = get_extracted_items(document_id)
    return ActionsResponse(document_id=document_id, actions=[_to_item_payload(row) for row in extracted_rows])


async def _save_uploaded_pdf(file: UploadFile) -> dict:
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        print(f"[Nirnay AI] Upload rejected for '{filename}': not a PDF extension.")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        print(f"[Nirnay AI] Upload rejected for '{filename}': empty file.")
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(content) > MAX_DEMO_FILE_SIZE_BYTES:
        print(f"[Nirnay AI] Upload rejected for '{filename}': file too large for demo.")
        raise HTTPException(status_code=400, detail="File too large for demo")

    if not _is_valid_pdf(content):
        print(f"[Nirnay AI] Upload rejected for '{filename}': invalid/corrupted PDF bytes.")
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    document_id = str(uuid4())
    stored_path = UPLOAD_DIR / f"{document_id}.pdf"

    with stored_path.open("wb") as stream:
        stream.write(content)

    print(f"[Nirnay AI] Upload successful. document_id='{document_id}', filename='{filename}'")

    return insert_document(
        document_id=document_id,
        original_filename=filename,
        stored_path=str(stored_path),
    )


def _extract_and_store(document_id: str, pdf_path: Path) -> tuple[list[dict], bool]:
    extracted_items, fallback = safe_extract_items_from_pdf(pdf_path)

    if not extracted_items:
        extracted_items = get_fallback_extractions()
        fallback = True

    rows = replace_extracted_items(document_id=document_id, items=extracted_items)

    if fallback:
        print(f"[Nirnay AI] Extraction fallback used for document_id='{document_id}'.")
    else:
        print(f"[Nirnay AI] Extraction successful for document_id='{document_id}'.")

    return rows, fallback


def _is_valid_pdf(content: bytes) -> bool:
    try:
        with fitz.open(stream=content, filetype="pdf") as document:
            return document.page_count >= 1
    except Exception:
        return False


def _to_item_payload(row: dict) -> dict:
    enriched_fields = enrich_verified_item(
        direction=str(row["direction"]),
        department=str(row["department"]),
        deadline=str(row["deadline"]),
        source_snippet=str(row["source_snippet"]),
        confidence=float(row["confidence"]),
        page_number=int(row["page_number"]),
    )

    return {
        "item_id": row["item_id"],
        **enriched_fields,
        "status": row["status"],
    }


def _field_verification(original: str, edited: str) -> FieldVerification:
    field_status = "edited" if original != edited else "approved"
    return FieldVerification(original=original, edited=edited, status=field_status)
