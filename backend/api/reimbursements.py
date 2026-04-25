import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import joinedload
from sqlmodel import Session, select

from api import deps
from api.schemas import (
    ReimbursementResponse,
    StatusUpdateRequest,
    AnalyzeReimbursementRequest,
    LineItemResponse,
)
from core.models import (
    User, Reimbursement, SupportingDocument, TravelSettlement, Policy,
    LineItem, ReimbursementSubCategory, SettlementCategory,
    Department,
)
from core.enums import UserRole, ReimbursementStatus, JudgmentResult
from engine.agents.compliance_agent import run_compliance_workflow

router = APIRouter()
logger = logging.getLogger(__name__)


def _enum_val(field) -> str:
    """Safely extract enum string value from either an enum instance or a raw string."""
    return field.value if field and hasattr(field, "value") else str(field) if field is not None else None


def _build_reimbursement_response(
    r: Reimbursement,
    db: Session,
    include_line_items: bool = True,
    employee_name: Optional[str] = None,
    department_name: Optional[str] = None,
) -> dict:
    """Build a response dict for a Reimbursement row, including joined data."""
    # Fetch line items
    line_items = db.exec(
        select(LineItem).where(LineItem.reim_id == r.reim_id)
    ).all()
    # Fetch sub categories
    sub_cats = db.exec(
        select(ReimbursementSubCategory).where(
            ReimbursementSubCategory.reim_id == r.reim_id
        )
    ).all()

    # Use pre-fetched names if provided, otherwise look up
    if employee_name is None or department_name is None:
        user = db.get(User, r.user_id)
        if user:
            employee_name = user.name
            if user.department_id:
                dept = db.get(Department, user.department_id)
                if dept:
                    department_name = dept.name
        employee_name = employee_name or "Unknown"
        department_name = department_name or "Unknown"

    result = {
        "reim_id": str(r.reim_id),
        "user_id": str(r.user_id),
        "employee_name": employee_name,
        "department_name": department_name,
        "policy_id": str(r.policy_id) if r.policy_id else None,
        "settlement_id": str(r.settlement_id) if r.settlement_id else None,
        "main_category": r.main_category,
        "currency": r.currency,
        "total_claimed_amount": float(r.total_claimed_amount) if r.total_claimed_amount else None,
        "total_approved_amount": float(r.total_approved_amount) if r.total_approved_amount else None,
        "total_rejected_amount": float(r.total_rejected_amount) if r.total_rejected_amount else None,
        "confidence": r.confidence,
        "judgment": _enum_val(r.judgment),
        "status": _enum_val(r.status),
        "summary": r.summary,
        "ai_reasoning": r.ai_reasoning,
        "reviewed_by": str(r.reviewed_by) if r.reviewed_by else None,
        "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        "sub_categories": [sc.sub_category for sc in sub_cats],
    }

    if include_line_items:
        result["line_items"] = [
            {
                "line_item_id": str(li.line_item_id),
                "reim_id": str(li.reim_id),
                "document_id": str(li.document_id) if li.document_id else None,
                "description": li.description,
                "category": li.category,
                "quantity": li.quantity,
                "unit_price": float(li.unit_price) if li.unit_price else None,
                "claimed_amount": float(li.claimed_amount) if li.claimed_amount else None,
                "approved_amount": float(li.approved_amount) if li.approved_amount else None,
                "currency": li.currency,
                "expense_date": li.expense_date.isoformat() if li.expense_date else None,
                "judgment": _enum_val(li.judgment),
                "rejection_reason": li.rejection_reason,
                "policy_section_ref": str(li.policy_section_ref) if li.policy_section_ref else None,
            }
            for li in line_items
        ]

    return result


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "compliance_analysis"}


@router.get("/")
def list_reimbursements(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    if current_user.role == UserRole.HR:
        stmt = select(Reimbursement)
    else:
        stmt = select(Reimbursement).where(Reimbursement.user_id == current_user.user_id)

    if status:
        stmt = stmt.where(Reimbursement.status == status)

    stmt = stmt.offset(offset).limit(limit)
    reimbursements = db.exec(stmt).all()

    # Bulk fetch employee and department names to avoid N+1
    user_ids = {r.user_id for r in reimbursements}
    users = db.exec(select(User).where(User.user_id.in_(user_ids))).all() if user_ids else []
    user_map = {u.user_id: u for u in users}

    dept_ids = {u.department_id for u in users if u.department_id}
    depts = db.exec(select(Department).where(Department.department_id.in_(dept_ids))).all() if dept_ids else []
    dept_map = {d.department_id: d for d in depts}

    name_map: dict[UUID, tuple[Optional[str], Optional[str]]] = {}
    for uid in user_ids:
        u = user_map.get(uid)
        if u:
            d = dept_map.get(u.department_id) if u.department_id else None
            name_map[uid] = (u.name, d.name if d else None)
        else:
            name_map[uid] = (None, None)

    return [
        _build_reimbursement_response(
            r,
            db,
            include_line_items=False,
            employee_name=name_map.get(r.user_id, (None, None))[0],
            department_name=name_map.get(r.user_id, (None, None))[1],
        )
        for r in reimbursements
    ]


@router.get("/{reim_id}")
def get_reimbursement(
    reim_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reimbursement not found")

    if current_user.role != UserRole.HR and r.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return _build_reimbursement_response(r, db, include_line_items=True)


@router.patch("/{reim_id}/status")
def update_reimbursement_status(
    reim_id: str,
    body: StatusUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
) -> dict:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reimbursement not found")

    # Fetch line items
    line_items = db.exec(
        select(LineItem).where(LineItem.reim_id == r.reim_id)
    ).all()

    # Constraint 1: Cannot APPROVE if any line item is REJECTED without override
    if body.status in (ReimbursementStatus.APPROVED,):
        rejected_items = [li for li in line_items if li.judgment == JudgmentResult.REJECTED]
        if rejected_items:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve: {len(rejected_items)} line item(s) are rejected. Override required."
            )

    # Constraint 2: total_approved_amount must equal SUM(line_items.approved_amount)
    approved_sum = sum(
        float(li.approved_amount or 0) for li in line_items
    )
    if body.status in (ReimbursementStatus.APPROVED, ReimbursementStatus.REJECTED):
        r.total_approved_amount = approved_sum
        r.total_rejected_amount = float(r.total_claimed_amount or 0) - approved_sum

    r.status = body.status
    r.reviewed_by = body.reviewed_by
    r.reviewed_at = datetime.now(timezone.utc)
    r.updated_at = datetime.now(timezone.utc)
    db.add(r)
    db.commit()
    db.refresh(r)

    return _build_reimbursement_response(r, db, include_line_items=True)


@router.get("/{reim_id}/line-items")
def get_reimbursement_line_items(
    reim_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reim_id")

    r = db.get(Reimbursement, reim_uuid)
    if not r:
        raise HTTPException(status_code=404, detail="Reimbursement not found")

    if current_user.role != UserRole.HR and r.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    line_items = db.exec(
        select(LineItem).where(LineItem.reim_id == r.reim_id)
    ).all()

    return [
        {
            "line_item_id": str(li.line_item_id),
            "reim_id": str(li.reim_id),
            "document_id": str(li.document_id) if li.document_id else None,
            "description": li.description,
            "category": li.category,
            "quantity": li.quantity,
            "unit_price": float(li.unit_price) if li.unit_price else None,
            "claimed_amount": float(li.claimed_amount) if li.claimed_amount else None,
            "approved_amount": float(li.approved_amount) if li.approved_amount else None,
            "currency": li.currency,
            "expense_date": li.expense_date.isoformat() if li.expense_date else None,
            "judgment": _enum_val(li.judgment),
            "rejection_reason": li.rejection_reason,
            "policy_section_ref": str(li.policy_section_ref) if li.policy_section_ref else None,
        }
        for li in line_items
    ]


@router.post("/analyze")
def analyze_reimbursement(
    request: AnalyzeReimbursementRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Run basket compliance analysis on a TravelSettlement against a policy."""
    try:
        settlement_uuid = UUID(request.settlement_id)
        policy_uuid = UUID(request.policy_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid settlement_id or policy_id",
        )

    settlement = db.get(TravelSettlement, settlement_uuid)
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement {request.settlement_id} not found",
        )

    # Constraint 6: settlement must belong to same user
    if settlement.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Settlement does not belong to current user",
        )

    # Fetch policy to get main_category and reimbursable categories
    policy = db.get(Policy, policy_uuid)
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy {request.policy_id} not found",
        )

    # Fetch reimbursable categories from normalized table
    from core.models import PolicyReimbursableCategory
    policy_cats = db.exec(
        select(PolicyReimbursableCategory).where(
            PolicyReimbursableCategory.policy_id == policy_uuid
        )
    ).all()
    reimbursable_categories = [c.category for c in policy_cats]

    # Auto-fetch main_category from policy (first reimbursable category)
    main_category = reimbursable_categories[0] if reimbursable_categories else ""

    if not main_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Policy has no reimbursable categories",
        )

    # Cache check: return cached result if no human edits and settlement was already evaluated
    has_edits = bool(
        db.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == settlement_uuid,
                SupportingDocument.human_edited == True,  # noqa: E712
            )
        ).first()
    )

    # Check for existing reimbursement (circular FK removed, use settlement_id instead)
    cached_reim = db.exec(
        select(Reimbursement).where(Reimbursement.settlement_id == settlement_uuid)
    ).first()

    if not has_edits and cached_reim:
        return _build_reimbursement_response(cached_reim, db, include_line_items=True)

    # Fetch settlement categories from normalized table
    settlement_cats = db.exec(
        select(SettlementCategory).where(
            SettlementCategory.settlement_id == settlement_uuid
        )
    ).all()
    all_category = [c.category for c in settlement_cats]

    if not all_category:
        all_category = reimbursable_categories or [main_category]

    try:
        result = run_compliance_workflow(
            settlement_id=request.settlement_id,
            policy_id=request.policy_id,
            main_category=main_category,
            user_id=str(current_user.user_id),
            all_category=all_category,
            session=db,
            document_ids=request.document_ids,
        )
    except Exception as e:
        logger.exception("Compliance workflow failed")
        raise HTTPException(
            status_code=500,
            detail=f"Compliance workflow failed: {type(e).__name__}: {str(e)}"
        )

    if result.get("reimbursement_id"):
        reim = db.get(Reimbursement, UUID(result["reimbursement_id"]))
        if reim:
            return _build_reimbursement_response(reim, db, include_line_items=True)

    return {
        **result,
        "main_category": main_category,
        "sub_categories": all_category or [],
        "cached": False,
        "message": "First-time evaluation"
    }
