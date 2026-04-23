import re
import json
import logging
from typing import TypedDict, List, Any, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langgraph.graph import StateGraph, START, END
from sqlmodel import Session, select

from core.models import User, Policy, Reimbursement, SupportingDocument, TravelSettlement
from engine.llm import get_chat_llm
from engine.prompts.compliance_prompts import AGENT_EVALUATION_PROMPT
from engine.tools.rag_tool import search_policy_sections

logger = logging.getLogger(__name__)


class ComplianceWorkflowState(TypedDict):
    document_ids: List[str]
    settlement_id: str
    policy_id: str
    main_category: str
    sub_category: str
    user_id: str
    currency: str
    user: Optional[Any]
    receipt_extracted_data: dict
    policy: Optional[Any]
    all_category: List[str]
    mandatory_conditions: dict
    combined_conditions: List[str]
    policy_sections_text: str
    chain_of_thought: dict
    amount: dict
    confidence: float
    judgment: str
    summary: str
    reimbursement_id: str


def load_context(state: ComplianceWorkflowState, session: Session) -> dict:
    user = session.get(User, UUID(state["user_id"]))
    policy = session.get(Policy, UUID(state["policy_id"]))

    try:
        conditions_dict = json.loads(policy.mandatory_conditions) if policy and policy.mandatory_conditions else {}
    except (json.JSONDecodeError, TypeError):
        conditions_dict = {}

    # Resolve all_category from the settlement if not already populated
    all_category = state.get("all_category") or []
    if not all_category and state.get("settlement_id"):
        try:
            settlement = session.get(TravelSettlement, UUID(state["settlement_id"]))
            if settlement:
                all_category = settlement.all_category or []
        except Exception:
            pass

    # Combine conditions from all claim categories (deduped)
    combined_conditions: List[str] = []
    seen_conditions: set = set()
    for cat in all_category:
        cat_data = conditions_dict.get(cat) or {}
        if not cat_data:
            matched = next((k for k in conditions_dict if k.lower() == cat.lower()), None)
            cat_data = conditions_dict[matched] if matched else {}
        for cond in cat_data.get("condition", []):
            if cond not in seen_conditions:
                seen_conditions.add(cond)
                combined_conditions.append(cond)

    # Retrieve policy sections for amount/limit lookup (keyword search, no embeddings)
    policy_sections_text = search_policy_sections(
        policy_id=state["policy_id"],
        session=session,
        keywords=all_category + [state.get("main_category", ""), "amount", "limit", "rate", "maximum"],
    )

    # Find main receipt OCR data
    doc_uuids = [UUID(d) for d in state["document_ids"]]
    main_doc = session.exec(
        select(SupportingDocument).where(
            SupportingDocument.document_id.in_(doc_uuids),
            SupportingDocument.is_main == True,
        )
    ).first()
    receipt_extracted_data = (main_doc.extracted_data or {}) if main_doc else {}
    currency = receipt_extracted_data.get("currency") or ""
    if currency == "Not found in Receipt":
        currency = ""

    return {
        "user": user,
        "policy": policy,
        "all_category": all_category,
        "mandatory_conditions": conditions_dict,
        "combined_conditions": combined_conditions,
        "policy_sections_text": policy_sections_text,
        "receipt_extracted_data": receipt_extracted_data,
        "currency": currency,
        "chain_of_thought": {},
        "amount": {},
        "confidence": 0.0,
    }


def check_conditions(state: ComplianceWorkflowState, session: Session) -> dict:
    user = state["user"]
    policy = state["policy"]
    combined_conditions = state.get("combined_conditions", [])
    all_category = state.get("all_category", [])
    policy_sections_text = state.get("policy_sections_text", "")

    eval_prompt = AGENT_EVALUATION_PROMPT.format(
        employee_name=user.name if user else "Unknown",
        department=user.department if user else "Unknown",
        rank=str(user.rank) if user else "1",
        all_category=json.dumps(all_category),
        main_category=state.get("main_category", ""),
        policy_overview=policy.overview_summary if policy else "",
        effective_date=policy.effective_date.strftime("%Y-%m-%d") if policy and policy.effective_date else "Unknown",
        conditions=json.dumps(combined_conditions, indent=2),
        policy_sections=policy_sections_text or "(no policy sections available)",
        receipt_data=json.dumps(state.get("receipt_extracted_data", {}), indent=2),
    )

    response = get_chat_llm().invoke([HumanMessage(content=eval_prompt)])
    final_content = response.content if isinstance(response.content, str) else ""

    parsed: dict = {}
    try:
        parser = JsonOutputParser()
        parsed = parser.parse(final_content)
    except Exception:
        try:
            match = re.search(r'\{.*\}', final_content, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
        except Exception:
            parsed = {
                "chain_of_thought": {
                    "evaluation": {
                        "flag": "MANUAL_REVIEW",
                        "reason": "Could not parse evaluation response.",
                        "note": final_content[:500] if final_content else "No response from LLM.",
                    }
                },
                "amount": {},
                "confidence": 0.0,
                "judgment": "MANUAL REVIEW",
                "summary": "Evaluation parsing failed; manual review required.",
            }

    return {
        "chain_of_thought": parsed.get("chain_of_thought", {}),
        "amount": parsed.get("amount", {}),
        "confidence": float(parsed.get("confidence", 0.0)),
        "judgment": parsed.get("judgment", "MANUAL REVIEW"),
        "summary": parsed.get("summary", ""),
    }


def save_reimbursement(state: ComplianceWorkflowState, session: Session) -> dict:
    user = state["user"]

    settlement_uuid = UUID(state["settlement_id"]) if state.get("settlement_id") else None

    reimbursement = Reimbursement(
        user_id=UUID(state["user_id"]),
        policy_id=UUID(state["policy_id"]),
        settlement_id=settlement_uuid,
        main_category=state["main_category"],
        sub_category=state["sub_category"],
        employee_department=user.department if user else None,
        employee_rank=user.rank if user else 1,
        currency=state["currency"],
        amount=state.get("amount", {}),
        confidence=state.get("confidence"),
        judgment=state.get("judgment", "MANUAL REVIEW"),
        status="REVIEW",
        chain_of_thought=state.get("chain_of_thought", {}),
        summary=state.get("summary", ""),
    )

    try:
        session.add(reimbursement)
        session.flush()

        doc_uuids = [UUID(d) for d in state["document_ids"]]
        docs = session.exec(
            select(SupportingDocument).where(SupportingDocument.document_id.in_(doc_uuids))
        ).all()
        for doc in docs:
            doc.reim_id = reimbursement.reim_id
            session.add(doc)

        # Back-link the settlement to this reimbursement
        if settlement_uuid:
            settlement = session.get(TravelSettlement, settlement_uuid)
            if settlement:
                settlement.reimbursement_id = reimbursement.reim_id
                session.add(settlement)

        session.commit()
        session.refresh(reimbursement)
    except Exception:
        session.rollback()
        raise

    return {"reimbursement_id": str(reimbursement.reim_id)}


def run_compliance_workflow(
    document_ids: List[str],
    settlement_id: str,
    policy_id: str,
    main_category: str,
    sub_category: str,
    user_id: str,
    all_category: Optional[List[str]],
    session: Session,
) -> dict:
    def _load_context(state): return load_context(state, session)
    def _check_conditions(state): return check_conditions(state, session)
    def _save_reimbursement(state): return save_reimbursement(state, session)

    graph = StateGraph(ComplianceWorkflowState)

    graph.add_node("load_context", _load_context)
    graph.add_node("check_conditions", _check_conditions)
    graph.add_node("save_reimbursement", _save_reimbursement)

    graph.add_edge(START, "load_context")
    graph.add_edge("load_context", "check_conditions")
    graph.add_edge("check_conditions", "save_reimbursement")
    graph.add_edge("save_reimbursement", END)

    app = graph.compile()
    result = app.invoke({
        "document_ids": document_ids,
        "settlement_id": settlement_id,
        "policy_id": policy_id,
        "main_category": main_category,
        "sub_category": sub_category,
        "user_id": user_id,
        "currency": "",
        "user": None,
        "receipt_extracted_data": {},
        "policy": None,
        "all_category": all_category or [],
        "mandatory_conditions": {},
        "combined_conditions": [],
        "policy_sections_text": "",
        "chain_of_thought": {},
        "amount": {},
        "confidence": 0.0,
        "judgment": "",
        "summary": "",
        "reimbursement_id": "",
    })

    return {
        "reimbursement_id": result.get("reimbursement_id", ""),
        "judgment": result.get("judgment", ""),
        "summary": result.get("summary", ""),
        "chain_of_thought": result.get("chain_of_thought", {}),
        "amount": result.get("amount", {}),
        "confidence": result.get("confidence", 0.0),
    }
