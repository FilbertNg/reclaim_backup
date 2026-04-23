"""
Policy section retrieval for compliance evaluation.
Uses keyword/ILIKE text search (embeddings retired; pgvector still installed but unused).
"""
from typing import List, Optional
from uuid import UUID

from sqlmodel import Session, select, text

from core.models import PolicySection


def search_policy_sections(
    policy_id: str,
    session: Session,
    keywords: Optional[List[str]] = None,
    limit: int = 8,
) -> str:
    """
    Retrieve policy section text relevant to the given keywords.

    Returns a single concatenated string ready to inject into a prompt.
    Falls back to returning the first `limit` sections if no keyword match is found.
    """
    policy_uuid = UUID(policy_id)

    all_sections = session.exec(
        select(PolicySection)
        .where(PolicySection.policy_id == policy_uuid)
        .limit(100)
    ).all()

    if not all_sections:
        return ""

    if keywords:
        kw_lower = [k.lower() for k in keywords if k]
        matched = [
            s for s in all_sections
            if any(kw in s.content.lower() for kw in kw_lower)
        ]
        sections = matched[:limit] if matched else all_sections[:limit]
    else:
        sections = all_sections[:limit]

    parts = []
    for i, s in enumerate(sections, 1):
        excerpt = s.content[:1500]
        parts.append(f"[Section {i}]\n{excerpt}")

    return "\n\n".join(parts)
