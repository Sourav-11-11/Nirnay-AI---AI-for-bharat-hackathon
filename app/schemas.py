from typing import Literal

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    document_id: str
    filename: str


class ExtractedItem(BaseModel):
    item_id: str
    direction: str
    action: str
    next_step: str
    type: Literal["COMPLY", "CONSIDER_APPEAL", "NO_ACTION"]
    department: str
    department_reason: str
    deadline: str
    exact_deadline_date: str | None = None
    days_remaining: int | None = None
    priority: Literal["HIGH", "MEDIUM", "LOW"]
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)
    confidence_explanation: str
    risk: str
    source_snippet: str
    page_number: int = Field(ge=1)
    status: Literal["approved", "edited"]


class ExtractionResponse(BaseModel):
    document_id: str
    items: list[ExtractedItem]
    fallback: bool


class VerificationUpdateRequest(BaseModel):
    direction: str | None = None
    department: str | None = None
    deadline: str | None = None
    status: Literal["approved", "edited"] | None = None


class FieldVerification(BaseModel):
    original: str
    edited: str
    status: Literal["approved", "edited"]


class VerificationResponse(BaseModel):
    item_id: str
    status: Literal["approved", "edited"]
    direction: FieldVerification
    department: FieldVerification
    deadline: FieldVerification


class ActionsResponse(BaseModel):
    document_id: str
    actions: list[ExtractedItem]
