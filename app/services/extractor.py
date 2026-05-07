from __future__ import annotations

import re
from collections.abc import Iterable
from typing import Any, cast
from datetime import date, datetime, timedelta
from pathlib import Path

import fitz

ACTION_DIRECTIVE_KEYWORDS = (
    "shall",
    "directed",
    "ordered",
    "must",
    "required",
    "dispose",
    "consider",
    "grant",
    "pay",
    "within",
    "comply",
)

STRICT_ACTION_KEYWORDS = (
    "directed",
    "ordered",
    "shall",
    "must",
    "comply",
    "dispose",
    "consider",
    "within",
    "grant",
    "pay",
)

PROCEDURAL_METADATA_MARKERS = (
    "mfa",
    "w.p",
    "wp",
    "s.l.p",
    "slp",
    "u/s",
    "section",
    "cch",
    "filed",
    "appellant",
    "respondent",
    "advocate",
    "petitioner",
)

NON_ACTION_CONTEXT_PHRASES = (
    "does not contemplate",
    "it is submitted",
    "it was submitted",
    "learned counsel",
    "no further question",
    "it is contended",
    "it was contended",
    "on behalf of",
)

MANUAL_REVIEW_DEPARTMENT = "Needs Assignment"
MANUAL_REVIEW_REASON = "Department keyword not detected. Officer manual mapping required."

ActionValue = str | int | float | None | bool | list
ActionRecord = dict[str, ActionValue]

ADVERSE_RULING_KEYWORDS = (
    "petition is dismissed",
    "appeal is dismissed",
    "dismissed",
    "rejected",
    "denied",
    "adverse",
    "penalty imposed",
    "convicted",
)

WITHIN_DEADLINE_PATTERN = re.compile(
    r"\bwithin\s+(\d+)\s+(day|days|week|weeks|month|months)\b",
    flags=re.IGNORECASE,
)
DATE_DEADLINE_PATTERN = re.compile(
    r"\b(?:by|on)\s+(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b",
    flags=re.IGNORECASE,
)
DATE_TOKEN_PATTERN = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b",
    flags=re.IGNORECASE,
)

DEPARTMENT_RULES: list[tuple[tuple[str, ...], str, str]] = [
    (
        ("land", "acquisition", "collector", "revenue"),
        "Revenue Department",
        "Land acquisition or revenue administration matter.",
    ),
    (
        ("police", "fir", "investigation", "law and order", "commissioner", "crime"),
        "Home Department",
        "Police or criminal investigation matter.",
    ),
    (
        ("compensation", "financial", "payment", "grant", "subsidy"),
        "Finance Department",
        "Compensation or financial obligation matter.",
    ),
    (
        ("judicial", "court", "registry", "administration", "secretariat"),
        "Judicial Administration",
        "Court administration or judicial process matter.",
    ),
    (
        ("administrative", "administration", "governance"),
        "General Administration",
        "General administrative governance matter.",
    ),
]

CONFIDENCE_EXPLANATIONS: dict[str, list[tuple[tuple[str, ...], str]]] = {
    "COMPLY": [
        (("shall", "ordered", "directed"), "Mandatory directive language with explicit action verb."),
        (("must", "required"), "Clear obligation with enforcement markers present."),
        (("submit", "file", "report"), "Specific action and timeline detected in text."),
        (("within",), "Concrete deadline found; compliance scope is well-defined."),
    ],
    "CONSIDER_APPEAL": [
        (("petition dismissed", "appeal dismissed"), "Explicit dismissal indicator; appeal considerations justified."),
        (("adverse", "rejected", "denied"), "Unfavorable ruling language; appeal review warranted."),
        (("conviction", "penalty"), "Adverse outcome detected; legal review recommended."),
    ],
    "NO_ACTION": [
        (("monitor", "watch", "observe"), "Passive language; no immediate action required."),
        (("may", "consider", "optional"), "Discretionary language; low confidence of mandatory action."),
    ],
}

RISK_MAPPING: dict[str, list[tuple[tuple[str, ...], str]]] = {
    "COMPLY": [
        (("revenue", "land", "acquisition"), "Non-compliance may trigger contempt proceedings; seizure or enforcement action possible."),
        (("police", "fir", "investigation"), "Failure to comply risks criminal contempt charges and additional penalties."),
        (("administrative",), "Breach may lead to administrative sanctions or supersession of authority."),
        (("submit", "report", "file"), "Default may result in financial penalties or suspension of related activities."),
    ],
    "CONSIDER_APPEAL": [
        (("revenue", "land", "acquisition"), "Missing appeal deadline forfeits review rights; order becomes final and binding."),
        (("police", "fir", "investigation"), "Delayed appeal may trigger implementation of adverse orders or sentence execution."),
        (("administrative",), "Failure to appeal timely results in finality; limited recourse thereafter."),
    ],
    "NO_ACTION": [
        (("monitor", "observe"), "Inaction may miss enforcement triggers or related proceedings."),
    ],
}

MOCK_EXTRACTIONS: list[ActionRecord] = [
    {
        "source_snippet": "The District Collector shall submit a compliance report within 30 days.",
        "page_number": 1,
        "confidence": 0.91,
    },
    {
        "source_snippet": "The petition is dismissed, and the State may consider filing an appeal within 90 days.",
        "page_number": 1,
        "confidence": 0.88,
    },
    {
        "source_snippet": "Municipal authorities must complete encroachment removal within 45 days.",
        "page_number": 1,
        "confidence": 0.86,
    },
]


def extract_items_from_pdf(pdf_path: Path) -> tuple[list[ActionRecord], bool]:
    candidates: list[ActionRecord] = []
    full_text_parts: list[str] = []
    used_mock_fallback = False

    with fitz.open(pdf_path) as document:
        for page_index in range(document.page_count):
            page_number = page_index + 1
            page = document.load_page(page_index)
            page_text = cast(Any, page).get_text("text") or ""
            full_text_parts.append(page_text)
            for line in _normalized_lines(page_text):
                if len(line) < 28:
                    continue

                if _looks_like_action_candidate(line):
                    candidates.append(
                        {
                            "source_snippet": line,
                            "page_number": page_number,
                            "confidence": _line_confidence(line),
                        }
                    )

    selected = _first_unique(candidates, max_items=3)

    if len(selected) < 3:
        selected.extend(MOCK_EXTRACTIONS[: 3 - len(selected)])
        used_mock_fallback = True

    judgment_date = _extract_judgment_date("\n".join(full_text_parts))

    result: list[ActionRecord] = []
    for row in selected[:3]:
        page_number_value = cast(int, row["page_number"])
        confidence_value = cast(float, row["confidence"])

        result.append(
            cast(
                ActionRecord,
                _build_decision_item(
                    source_snippet=str(row["source_snippet"]),
                    page_number=page_number_value,
                    confidence=confidence_value,
                    judgment_date=judgment_date,
                ),
            )
        )

    return result, used_mock_fallback


def get_fallback_extractions() -> list[ActionRecord]:
    result: list[ActionRecord] = []

    for row in MOCK_EXTRACTIONS[:3]:
        result.append(
            cast(
                ActionRecord,
                _build_decision_item(
                    source_snippet=str(row["source_snippet"]),
                    page_number=cast(int, row["page_number"]),
                    confidence=cast(float, row["confidence"]),
                    judgment_date=None,
                ),
            )
        )

    return result


def _merge_semantically_similar_actions(items: list[ActionRecord]) -> list[ActionRecord]:
    """
    Merge semantically similar actions to avoid repetition in UI.
    Groups items by matching action text, keeps strongest version with metadata.
    Adds: is_merged (bool), count (int), merged_sources (list[str])
    """
    # Group items by action text (exact match for deterministic behavior)
    groups: dict[str, list[ActionRecord]] = {}
    for item in items:
        action_key = cast(str, item.get("action", "")).lower().strip()
        if not action_key:
            action_key = "__NO_ACTION__"
        
        if action_key not in groups:
            groups[action_key] = []
        groups[action_key].append(item)
    
    # Merge each group
    result: list[ActionRecord] = []
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    
    for action_key, group_items in groups.items():
        if len(group_items) == 1:
            # Single item: no merge needed
            item = group_items[0]
            item["is_merged"] = False
            item["count"] = 1
            item["merged_sources"] = []
            result.append(item)
        else:
            # Multiple items with same action: merge them
            # Select strongest item (by priority, then deadline, then confidence)
            strongest = group_items[0]
            merged_sources = [cast(str, item.get("source_snippet", "")) for item in group_items]
            
            for item in group_items[1:]:
                # Prefer higher priority
                current_priority = priority_order.get(cast(str, strongest.get("priority", "LOW")), 3)
                item_priority = priority_order.get(cast(str, item.get("priority", "LOW")), 3)
                
                if item_priority < current_priority:
                    strongest = item
                    continue
                
                if item_priority == current_priority:
                    # Same priority: prefer earlier deadline
                    strongest_days = cast(int | None, strongest.get("days_remaining", 999))
                    item_days = cast(int | None, item.get("days_remaining", 999))
                    
                    # Treat None as very far future (999)
                    if strongest_days is None:
                        strongest_days = 999
                    if item_days is None:
                        item_days = 999
                    
                    if item_days < strongest_days:
                        strongest = item
                        continue
                    
                    # Same priority and deadline: prefer higher confidence
                    if cast(float, item.get("confidence", 0)) > cast(float, strongest.get("confidence", 0)):
                        strongest = item
            
            # Build merged item
            merged_item = dict(strongest)
            merged_item["is_merged"] = True
            merged_item["count"] = len(group_items)
            merged_item["merged_sources"] = merged_sources
            
            result.append(merged_item)
    
    return result


def safe_extract_items_from_pdf(pdf_path: Path) -> tuple[list[ActionRecord], bool]:
    try:
        items, fallback = extract_items_from_pdf(pdf_path)
        # Merge semantically similar actions
        merged_items = _merge_semantically_similar_actions(items)
        return merged_items, fallback
    except Exception as exc:
        print(f"[Nirnay AI] Extraction error for '{pdf_path}': {exc}. Returning fallback data.")
        fallback_items = get_fallback_extractions()
        merged_items = _merge_semantically_similar_actions(fallback_items)
        return merged_items, True


def enrich_verified_item(
    direction: str,
    department: str,
    deadline: str,
    source_snippet: str,
    confidence: float,
    page_number: int,
) -> dict[str, str | int | float | None | bool | list]:
    source_text = source_snippet.strip() if source_snippet.strip() else direction.strip()
    normalized_direction = direction.strip() if direction.strip() else _to_direction_text(source_text)

    action_type = _infer_action_type(f"{normalized_direction} {source_text}")
    resolved_department, department_reason, dept_confidence = _resolve_department(department, source_text)
    resolved_deadline = _normalize_deadline(deadline, action_type, None, source_text)
    priority = _infer_priority(resolved_deadline, None)

    return {
        "direction": normalized_direction,
        "action": _build_action_text(normalized_direction, action_type, resolved_department),
        "next_step": _build_next_step(action_type, resolved_department, resolved_deadline),
        "type": action_type,
        "department": resolved_department,
        "department_reason": department_reason,
        "department_confidence": dept_confidence,
        "deadline": resolved_deadline,
        "exact_deadline_date": _deadline_to_exact_date(resolved_deadline, None),
        "days_remaining": _deadline_to_days_remaining(resolved_deadline, None),
        "priority": priority,
        "reason": _build_reason(action_type, resolved_deadline, resolved_department),
        "confidence": round(float(confidence), 2),
        "confidence_explanation": _build_confidence_explanation(action_type, f"{normalized_direction} {source_text}"),
        "risk": _build_risk_assessment(action_type, resolved_department, resolved_deadline, f"{normalized_direction} {source_text}"),
        "source_snippet": source_text,
        "page_number": int(page_number),
        "is_merged": False,
        "count": 1,
        "merged_sources": [],
    }


def _normalized_lines(page_text: str) -> Iterable[str]:
    for raw_line in page_text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        if line:
            yield line


def _looks_like_action_candidate(line: str) -> bool:
    lowered = line.lower()
    if _is_procedural_metadata_line(lowered):
        return False

    if any(phrase in lowered for phrase in NON_ACTION_CONTEXT_PHRASES):
        return False

    keyword_hits = [keyword for keyword in STRICT_ACTION_KEYWORDS if _keyword_in_text(keyword, lowered)]
    if not keyword_hits:
        return False

    # "within" alone in procedural/legal context is usually not an executable directive.
    if keyword_hits == ["within"] and sum(1 for marker in PROCEDURAL_METADATA_MARKERS if marker in lowered) >= 1:
        return False

    return True


def _is_procedural_metadata_line(lowered_line: str) -> bool:
    if any(
        lowered_line.startswith(prefix)
        for prefix in ("in the", "before the", "present:", "between:", "and:", "dated this")
    ):
        return True

    metadata_hits = sum(1 for marker in PROCEDURAL_METADATA_MARKERS if marker in lowered_line)
    has_directive_marker = any(_keyword_in_text(keyword, lowered_line) for keyword in STRICT_ACTION_KEYWORDS)
    has_deadline_context = bool(WITHIN_DEADLINE_PATTERN.search(lowered_line) or DATE_DEADLINE_PATTERN.search(lowered_line))

    # Procedural text with no actionable verb should be rejected.
    if metadata_hits >= 2 and not has_directive_marker and not has_deadline_context:
        return True

    return False


def _keyword_in_text(keyword: str, lowered_text: str) -> bool:
    if " " in keyword:
        return keyword in lowered_text
    return re.search(rf"\b{re.escape(keyword)}\b", lowered_text) is not None


def _line_confidence(line: str) -> float:
    score = 0.55
    lowered = line.lower()

    if _looks_like_action_candidate(line):
        score += 0.2
    if WITHIN_DEADLINE_PATTERN.search(lowered) or DATE_DEADLINE_PATTERN.search(lowered):
        score += 0.12
    if len(line) > 85:
        score += 0.07
    
    # Natural variation based on text specificity
    if "court" in lowered or "judgment" in lowered:
        score += 0.03
    if any(dept in lowered for dept in ("revenue", "police", "administrative")):
        score += 0.02

    unique_token_bonus = min(len(set(lowered.split())) * 0.0015, 0.05)
    score += unique_token_bonus

    return min(score, 0.97)


def _first_unique(
    items: list[ActionRecord],
    max_items: int,
    seen: list[ActionRecord] | None = None,
) -> list[ActionRecord]:
    existing_snippets = set()
    if seen:
        for item in seen:
            existing_snippets.add(str(item["source_snippet"]).lower())

    unique_items: list[ActionRecord] = []
    for item in items:
        snippet_key = str(item["source_snippet"]).lower()
        if snippet_key in existing_snippets:
            continue
        unique_items.append(item)
        existing_snippets.add(snippet_key)

        if len(unique_items) >= max_items:
            break

    return unique_items


def _to_direction_text(source_snippet: str) -> str:
    direction = source_snippet.strip().rstrip(".")
    if len(direction) > 170:
        return direction[:167].rstrip() + "..."
    return direction


def _infer_action_type(text: str) -> str:
    lowered = text.lower()
    if any(_keyword_in_text(token, lowered) for token in ADVERSE_RULING_KEYWORDS):
        return "CONSIDER_APPEAL"
    if any(_keyword_in_text(token, lowered) for token in ACTION_DIRECTIVE_KEYWORDS):
        return "COMPLY"
    return "NO_ACTION"


def _infer_department_with_reason(text: str) -> tuple[str, str, str]:
    lowered = text.lower()
    
    # Primary keyword match (HIGH confidence)
    for keywords, department, reason in DEPARTMENT_RULES:
        if any(keyword in lowered for keyword in keywords):
            return department, reason, "HIGH"
    
    # Fallback: Best-guess department (LOW confidence)
    if any(word in lowered for word in ("revenue", "land", "property", "acquisition")):
        return "Revenue Department (Needs Review)", "Land/revenue pattern detected; confirm assignment.", "LOW"
    if any(word in lowered for word in ("police", "fir", "investigation", "crime")):
        return "Home Department (Needs Review)", "Police/criminal pattern detected; confirm assignment.", "LOW"
    if any(word in lowered for word in ("compensation", "payment", "financial", "grant", "subsidy")):
        return "Finance Department (Needs Review)", "Financial obligation detected; confirm assignment.", "LOW"
    if any(word in lowered for word in ("court", "judicial", "registry", "administration")):
        return "Judicial Administration (Needs Review)", "Court administrative matter detected; confirm assignment.", "LOW"
    
    return MANUAL_REVIEW_DEPARTMENT, MANUAL_REVIEW_REASON, "LOW"


def _resolve_department(department: str, text: str) -> tuple[str, str, str]:
    cleaned_department = department.strip()
    if not cleaned_department:
        return _infer_department_with_reason(text)

    inferred_department, inferred_reason, confidence = _infer_department_with_reason(text)
    if cleaned_department == inferred_department:
        return cleaned_department, inferred_reason, confidence
    lowered_department = cleaned_department.lower()
    if lowered_department.startswith("unknown") or "manual review" in lowered_department:
        return _infer_department_with_reason(text)
    return cleaned_department, "Department preserved from verified value.", "HIGH"


def _normalize_deadline(deadline: str, action_type: str, judgment_date: date | None, text: str) -> str:
    cleaned_deadline = deadline.strip()
    if cleaned_deadline:
        return cleaned_deadline
    return _infer_deadline(text, action_type, judgment_date)


def _infer_deadline(text: str, action_type: str, judgment_date: date | None) -> str:
    lowered = text.lower()
    
    # Check for explicit deadline phrases first
    if "immediately" in lowered or "forthwith" in lowered or "at once" in lowered:
        return "Immediately (court direction)"
    
    if "as early as possible" in lowered or "earliest" in lowered:
        return "As early as possible (within 14 days recommended)"
    
    if "reasonable time" in lowered:
        return "Within reasonable time (manual confirmation required)"

    within_match = WITHIN_DEADLINE_PATTERN.search(lowered)
    if within_match:
        return within_match.group(0)

    date_match = DATE_DEADLINE_PATTERN.search(lowered)
    if date_match:
        token = _extract_date_token(date_match.group(0))
        parsed = _parse_date_token(token) if token else None
        if parsed:
            return f"by {parsed.strftime('%d %b %Y')}"
        return date_match.group(0)

    if action_type == "CONSIDER_APPEAL":
        if judgment_date is not None:
            appeal_due_date = judgment_date + timedelta(days=90)
            return f"by {appeal_due_date.strftime('%d %b %Y')}"
        return "Within 90 days (standard appeal window)"

    if action_type == "COMPLY":
        return "Within reasonable time (manual confirmation required)"

    return "Not time-bound (monitoring required)"


def _deadline_to_days(deadline: str, judgment_date: date | None) -> int | None:
    lowered = deadline.lower().strip()
    if (
        not lowered
        or lowered == "not explicitly mentioned"
        or "not time-bound" in lowered
        or "reasonable time" in lowered
    ):
        return None

    if "immediately" in lowered or "forthwith" in lowered:
        return 1

    if "standard appeal window" in lowered:
        return 90

    within_match = WITHIN_DEADLINE_PATTERN.search(lowered)
    if within_match:
        amount = int(within_match.group(1))
        unit = within_match.group(2)
        if "week" in unit:
            return amount * 7
        if "month" in unit:
            return amount * 30
        return amount

    token = _extract_date_token(deadline)
    parsed_date = _parse_date_token(token) if token else None
    if parsed_date is not None and judgment_date is not None:
        return max((parsed_date - judgment_date).days, 0)

    return None


def _infer_priority(deadline: str, judgment_date: date | None) -> str:
    lowered = deadline.lower().strip()
    
    # HIGH: Strong directive words or immediate action required
    strong_directives = ["must", "shall", "immediately", "forthwith", "urgent"]
    if any(directive in lowered for directive in strong_directives):
        return "HIGH"
    if "immediate court direction" in lowered:
        return "HIGH"
    
    # Check deadline urgency
    days = _deadline_to_days(deadline, judgment_date)
    if days is None:
        days = _deadline_to_days_remaining(deadline, judgment_date)
    
    if days is not None:
        if days < 7:
            return "HIGH"
        if days < 30:
            return "MEDIUM"
        return "LOW"
    
    # MEDIUM: Has deadline context but no strict deadline
    if "reasonable time" in lowered or "within" in lowered:
        return "MEDIUM"
    
    # LOW: Vague or no deadline
    return "LOW"


def _build_action_text(direction: str, action_type: str, department: str) -> str:
    lowered = direction.lower()
    
    if action_type == "CONSIDER_APPEAL":
        if "compensation" in lowered:
            return "File appeal for compensation relief"
        if "dismissal" in lowered or "rejected" in lowered:
            return "Initiate appeal proceedings immediately"
        if "conviction" in lowered:
            return "File criminal appeal with legal cell"
        return "Pursue appellate review with legal team"
    
    if action_type == "COMPLY":
        if "compensation" in lowered:
            return "Release court-awarded compensation"
        if "encroachment" in lowered:
            return "Execute encroachment removal order"
        if "compliance report" in lowered or "submit" in lowered:
            return "Submit compliance report"
        if "land" in lowered or "acquisition" in lowered:
            return "Finalize land acquisition proceedings"
        if "order" in lowered:
            return "Issue written compliance order"
        if "payment" in lowered:
            return "Process payment as directed"
        if "investigation" in lowered or "fir" in lowered:
            return "Forward investigation file to prosecution"
        return "Execute court-ordered directive"
    
    return "Monitor for follow-up court orders"


def _rewrite_action_subject(direction: str) -> str:
    cleaned = re.sub(r"\s+", " ", direction.strip().rstrip("."))
    lowered = cleaned.lower()

    case_match = re.search(r"\b(?:lac|mfa|w\.?p\.?|rfa)\s*no\.?\s*[\w/-]+", cleaned, flags=re.IGNORECASE)
    if case_match:
        return f"{case_match.group(0)} decision"

    if "compensation" in lowered:
        return "court-awarded compensation"
    if "encroachment" in lowered:
        return "encroachment removal order"
    if "compliance report" in lowered:
        return "submission of compliance report"
    if "land acquisition" in lowered:
        return "land acquisition proceedings"

    words = cleaned.split()
    if len(words) > 9:
        return " ".join(words[:9])
    return cleaned


def _build_reason(action_type: str, deadline: str, department: str) -> str:
    if action_type == "CONSIDER_APPEAL":
        return f"Adverse outcome indicators detected. Legal review by {department} is required within timeline: {deadline}."
    if action_type == "COMPLY":
        return f"Mandatory directive language detected. {department} should execute within timeline: {deadline}."
    return "No direct executable direction found; maintain watch for follow-up judicial orders."


def _build_next_step(action_type: str, department: str, deadline: str) -> str:
    cleaned_deadline = deadline.strip()
    lowered_deadline = cleaned_deadline.lower()

    if action_type == "CONSIDER_APPEAL":
        return f"Send judgment to legal cell. File appeal for {department} {cleaned_deadline}."
    
    if action_type == "COMPLY":
        if "immediate" in lowered_deadline or "immediately" in lowered_deadline or "forthwith" in lowered_deadline:
            return f"Issue urgent written order to {department}. Submit same-day compliance confirmation."
        if department == MANUAL_REVIEW_DEPARTMENT:
            return f"Assign to responsible officer. Issue compliance directive. Track closure {cleaned_deadline}."
        return f"Issue written order to {department}. Submit compliance evidence {cleaned_deadline}."
    
    return f"Record order in {department}. Assign monitoring owner. Review weekly for follow-up."


def _build_confidence_explanation(action_type: str, text: str) -> str:
    """Build deterministic confidence explanation based on action type and text patterns."""
    lowered = text.lower()
    explanations = CONFIDENCE_EXPLANATIONS.get(action_type, [])

    for keywords, explanation in explanations:
        if any(keyword in lowered for keyword in keywords):
            return explanation

    # Fallback explanations
    if action_type == "COMPLY":
        return "Action verb and department context detected; confidence supported by text structure."
    if action_type == "CONSIDER_APPEAL":
        return "Appeal context identified; recommendation based on judgment indicators."
    return "Limited directive language; passive observation recommended."


def _build_risk_assessment(action_type: str, department: str, deadline: str, text: str) -> str:
    """Build deterministic risk assessment based on action type, department, and deadline."""
    lowered = text.lower()
    risk_options = RISK_MAPPING.get(action_type, [])

    # Check for department-specific keywords
    for keywords, risk_text in risk_options:
        if any(keyword in lowered or keyword in department.lower() for keyword in keywords):
            return risk_text

    # Fallback risks
    if action_type == "COMPLY":
        return f"Non-compliance may trigger enforcement action or penalties. {department} must meet stated deadline: {deadline}."
    if action_type == "CONSIDER_APPEAL":
        return f"Failure to timely pursue appeal may result in finality of adverse order. Review deadline: {deadline}."
    return "Continued monitoring required to detect any enforcement triggers or follow-up proceedings."


def _extract_date_token(text: str) -> str | None:
    match = DATE_TOKEN_PATTERN.search(text)
    if match:
        return match.group(1)
    return None


def _parse_date_token(token: str | None) -> date | None:
    if not token:
        return None

    cleaned = re.sub(r"\s+", " ", token.strip())
    formats = (
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%d-%m-%y",
        "%b %d %Y",
        "%B %d %Y",
        "%b %d, %Y",
        "%B %d, %Y",
    )

    for date_format in formats:
        try:
            return datetime.strptime(cleaned, date_format).date()
        except ValueError:
            continue

    return None


def _deadline_to_exact_date(deadline: str, judgment_date: date | None) -> str | None:
    """Convert deadline string to ISO 8601 date string (YYYY-MM-DD) or None if unparseable."""
    if not deadline or deadline.lower() == "not explicitly mentioned":
        return None

    lowered = deadline.lower().strip()
    today = date.today()

    # Handle "immediately" or "forthwith" → today
    if "immediately" in lowered or "forthwith" in lowered or "immediate court direction" in lowered:
        return (today + timedelta(days=1)).isoformat()

    if "reasonable time" in lowered or "not time-bound" in lowered:
        return None

    if "standard appeal window" in lowered:
        if judgment_date is not None:
            return (judgment_date + timedelta(days=90)).isoformat()
        return (today + timedelta(days=90)).isoformat()

    # Handle "within X day/week/month" → add to today
    within_match = WITHIN_DEADLINE_PATTERN.search(lowered)
    if within_match:
        amount = int(within_match.group(1))
        unit = within_match.group(2)
        if "week" in unit:
            days_to_add = amount * 7
        elif "month" in unit:
            days_to_add = amount * 30
        else:
            days_to_add = amount
        deadline_date = today + timedelta(days=days_to_add)
        return deadline_date.isoformat()

    # Handle explicit dates like "by 15 Dec 2026"
    token = _extract_date_token(deadline)
    parsed_date = _parse_date_token(token) if token else None
    if parsed_date is not None:
        return parsed_date.isoformat()

    # Handle "by {date} (90 days from judgment date)" pattern
    if judgment_date and "days from judgment" in lowered:
        within_match_in_deadline = re.search(r"(\d+)\s+days?\s+from", lowered)
        if within_match_in_deadline:
            days = int(within_match_in_deadline.group(1))
            deadline_date = judgment_date + timedelta(days=days)
            return deadline_date.isoformat()

    return None


def _deadline_to_days_remaining(deadline: str, judgment_date: date | None) -> int | None:
    """Calculate days remaining until deadline (negative if past due, None if unbounded)."""
    exact_date_str = _deadline_to_exact_date(deadline, judgment_date)
    if not exact_date_str:
        return None

    try:
        deadline_date = datetime.fromisoformat(exact_date_str).date()
        days_remaining = (deadline_date - date.today()).days
        return days_remaining
    except (ValueError, AttributeError):
        return None


def _extract_judgment_date(document_text: str) -> date | None:
    lowered = document_text.lower()
    markers = ("judgment dated", "dated", "date of judgment", "pronounced on")

    for marker in markers:
        index = lowered.find(marker)
        if index >= 0:
            window = document_text[index : index + 140]
            token = _extract_date_token(window)
            parsed = _parse_date_token(token)
            if parsed is not None:
                return parsed

    token = _extract_date_token(document_text[:1200])
    return _parse_date_token(token)


def _build_decision_item(
    source_snippet: str,
    page_number: int,
    confidence: float,
    judgment_date: date | None,
) -> dict[str, str | int | float | None | bool | list]:
    normalized_source = source_snippet.strip()
    direction = _to_direction_text(normalized_source)
    action_type = _infer_action_type(normalized_source)
    department, department_reason, dept_confidence = _infer_department_with_reason(normalized_source)
    deadline = _infer_deadline(normalized_source, action_type, judgment_date)
    priority = _infer_priority(deadline, judgment_date)

    return {
        "direction": direction,
        "action": _build_action_text(direction, action_type, department),
        "next_step": _build_next_step(action_type, department, deadline),
        "type": action_type,
        "department": department,
        "department_reason": department_reason,
        "department_confidence": dept_confidence,
        "deadline": deadline,
        "exact_deadline_date": _deadline_to_exact_date(deadline, judgment_date),
        "days_remaining": _deadline_to_days_remaining(deadline, judgment_date),
        "priority": priority,
        "reason": _build_reason(action_type, deadline, department),
        "confidence": round(float(confidence), 2),
        "confidence_explanation": _build_confidence_explanation(action_type, normalized_source),
        "risk": _build_risk_assessment(action_type, department, deadline, normalized_source),
        "source_snippet": normalized_source,
        "page_number": int(page_number),
        "is_merged": False,
        "count": 1,
        "merged_sources": [],
    }
