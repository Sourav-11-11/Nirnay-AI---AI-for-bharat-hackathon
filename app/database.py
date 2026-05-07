from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "nirnay.db"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    schema = """
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        original_filename TEXT NOT NULL,
        stored_path TEXT NOT NULL,
        uploaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS extracted_items (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        rank INTEGER NOT NULL,
        original_direction TEXT NOT NULL,
        direction TEXT NOT NULL,
        original_department TEXT NOT NULL,
        department TEXT NOT NULL,
        original_deadline TEXT NOT NULL,
        deadline TEXT NOT NULL,
        confidence REAL NOT NULL,
        source_snippet TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_extracted_items_document_id
    ON extracted_items(document_id);
    """

    with get_connection() as connection:
        connection.executescript(schema)


def insert_document(document_id: str, original_filename: str, stored_path: str) -> dict[str, Any]:
    uploaded_at = _utc_now_iso()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO documents (id, original_filename, stored_path, uploaded_at)
            VALUES (?, ?, ?, ?)
            """,
            (document_id, original_filename, stored_path, uploaded_at),
        )

    document = get_document(document_id)
    if document is None:
        raise RuntimeError("Failed to create document record.")
    return document


def get_document(document_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, original_filename, stored_path, uploaded_at
            FROM documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()

    return dict(row) if row else None


def replace_extracted_items(document_id: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = _utc_now_iso()

    with get_connection() as connection:
        connection.execute("DELETE FROM extracted_items WHERE document_id = ?", (document_id,))

        for rank, item in enumerate(items, start=1):
            item_id = str(uuid4())
            connection.execute(
                """
                INSERT INTO extracted_items (
                    id, document_id, rank,
                    original_direction, direction,
                    original_department, department,
                    original_deadline, deadline,
                    confidence, source_snippet, page_number,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    document_id,
                    rank,
                    item["direction"],
                    item["direction"],
                    item["department"],
                    item["department"],
                    item["deadline"],
                    item["deadline"],
                    item["confidence"],
                    item["source_snippet"],
                    item["page_number"],
                    "approved",
                    now,
                    now,
                ),
            )

    return get_extracted_items(document_id)


def get_extracted_items(document_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id AS item_id,
                document_id,
                rank,
                original_direction,
                direction,
                original_department,
                department,
                original_deadline,
                deadline,
                confidence,
                source_snippet,
                page_number,
                status,
                created_at,
                updated_at
            FROM extracted_items
            WHERE document_id = ?
            ORDER BY rank ASC
            """,
            (document_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_extracted_item(item_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id AS item_id,
                document_id,
                rank,
                original_direction,
                direction,
                original_department,
                department,
                original_deadline,
                deadline,
                confidence,
                source_snippet,
                page_number,
                status,
                created_at,
                updated_at
            FROM extracted_items
            WHERE id = ?
            """,
            (item_id,),
        ).fetchone()

    return dict(row) if row else None


def update_extracted_item(
    item_id: str,
    direction: str,
    department: str,
    deadline: str,
    status: str,
) -> dict[str, Any] | None:
    updated_at = _utc_now_iso()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE extracted_items
            SET direction = ?, department = ?, deadline = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (direction, department, deadline, status, updated_at, item_id),
        )

        if cursor.rowcount == 0:
            return None

    return get_extracted_item(item_id)
