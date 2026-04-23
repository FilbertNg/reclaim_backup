from typing import Any, Dict

EDITABLE_FIELDS = {
    "merchant_name", "date", "time", "currency", "total_amount",
    "destination", "departure_date", "arrival_date", "location", "overseas"
}

SEVERITY_MATRIX = {
    "date": "HIGH",
    "total_amount": "HIGH",
    "departure_date": "HIGH",
    "arrival_date": "HIGH",
    "destination": "MEDIUM",
    "currency": "MEDIUM",
    "overseas": "MEDIUM",
    "merchant_name": "LOW",
    "time": "LOW",
    "location": "LOW",
}


def detect_changes(original_extracted_data: dict, human_edits: dict) -> Dict[str, Any]:
    """
    Compare original OCR data with human edits.
    Returns a change summary dict with has_changes, change_count, high_risk_count,
    changes_by_field, and overall_risk.
    """
    changes = {}
    high_risk_count = 0

    for field_name in EDITABLE_FIELDS:
        if field_name not in human_edits:
            continue

        original_val = original_extracted_data.get(field_name)
        edited_val = human_edits[field_name]

        if _values_equal(original_val, edited_val):
            continue

        severity = SEVERITY_MATRIX.get(field_name, "LOW")
        if severity == "HIGH":
            high_risk_count += 1

        changes[field_name] = {
            "original": original_val,
            "edited": edited_val,
            "severity": severity,
            "description": _describe_change(field_name, original_val, edited_val),
        }

    has_changes = bool(changes)
    return {
        "has_changes": has_changes,
        "change_count": len(changes),
        "high_risk_count": high_risk_count,
        "changes_by_field": changes,
        "overall_risk": _compute_risk_level(changes),
    }


def _values_equal(v1: Any, v2: Any) -> bool:
    if v1 == v2:
        return True
    sentinel = {"", "Not found in Receipt"}
    if v1 is None and v2 in sentinel:
        return True
    if v2 is None and v1 in sentinel:
        return True
    if isinstance(v1, str) and isinstance(v2, str):
        return v1.strip() == v2.strip()
    if isinstance(v1, bool) or isinstance(v2, bool):
        return bool(v1) == bool(v2)
    return False


def _describe_change(field: str, orig: Any, edited: Any) -> str:
    if field == "total_amount":
        orig_num = float(orig or 0)
        edited_num = float(edited or 0)
        delta = edited_num - orig_num
        sign = "+" if delta >= 0 else ""
        return f"Amount changed from {orig_num:.2f} to {edited_num:.2f} (Δ {sign}{delta:.2f})"
    if field == "date":
        return f"Receipt date adjusted from '{orig}' to '{edited}'"
    if field in ("departure_date", "arrival_date"):
        return f"{field} changed from '{orig}' to '{edited}'"
    return f"{field} changed from '{orig}' to '{edited}'"


def _compute_risk_level(changes: dict) -> str:
    if not changes:
        return "NONE"
    if any(c["severity"] == "HIGH" for c in changes.values()):
        return "HIGH"
    if any(c["severity"] == "MEDIUM" for c in changes.values()):
        return "MEDIUM"
    return "LOW"
