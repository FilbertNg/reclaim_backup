# Reclaim — Agent Workflows Documentation

## Overview

Reclaim uses three AI-powered workflows to automate HR reimbursement processing.
All LLM calls are routed through **OpenRouter** (vision/text) and **ILMU API** (chat) and traced in **LangSmith** (project: `um_hackathon`).

```
Employee                HR                   AI Agents                    Database
   │                     │                       │                            │
   │      Upload PDFs     │                       │                            │
   │─────────────────────>│                       │                            │
   │                     │── run_policy_workflow─>│                            │
   │                     │                       │──── Policy row ───────────>│
   │                     │                       │                            │
   │── Upload Receipts ──────────────────────────>│                            │
   │          process_receipts (parallel OCR)     │                            │
   │                     │                       │──── SupportingDocument ───>│
   │                     │                       │──── TravelSettlement ─────>│
   │                     │<── settlement_id ──────│                            │
   │                     │                       │                            │
   │── Analyze claim ─────────────────────────────>│  (settlement_id required) │
   │       run_compliance_workflow                │                            │
   │                     │                       │──── Reimbursement ────────>│
   │<─── Judgment ─────────────────────────────────│                           │
```

---

## Workflow 1 — HR Policy Upload

**Trigger**: `POST /api/v1/policies/upload` (HR role required)
**File**: `backend/engine/agents/policy_agent.py`
**LangGraph**: Sequential 4-node pipeline

### Flow

```
[START]
   │
   ▼
┌────────────────────────────────────────────────────────┐
│  Node 1: process_pdfs                                  │
│  • pymupdf4llm converts each PDF → Markdown text       │
│  • Strips image placeholders                           │
│  State: markdown_docs = [{file, text}]                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 2: extract_categories_and_summary                │
│  • Combines all markdown (cap 80k chars)               │
│  • Chat LLM (JSON mode)                                │
│  • Prompt: POLICY_CATEGORY_SUMMARY_PROMPT              │
│  • Extracts: title, categories[], overview_summary     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 3: extract_conditions                            │
│  • Combines all markdown (cap 80k chars)               │
│  • Chat LLM (JSON mode)                                │
│  • Prompt: POLICY_CONDITIONS_PROMPT                    │
│  • Extracts: {CategoryName: {condition[]}}             │
│  • Note: required_documents removed from schema        │
│  State: mandatory_procedures                           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 4: save_to_db                                    │
│  • Creates Policy row (alias, title, categories,       │
│    overview_summary, mandatory_conditions as JSON,     │
│    status=ACTIVE)                                      │
│  • session.commit()                                    │
│  Returns: policy_id                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `policies` | alias, title, reimbursable_category[], overview_summary, mandatory_conditions (JSON string), source_file_url, status="ACTIVE" |

### API Input

```http
POST /api/v1/policies/upload
Authorization: Bearer <HR token>
Content-Type: multipart/form-data

alias=Business Travel Policy 2024
files=policy_main.pdf
files=appendix_forms.pdf
```

### API Output

```json
{
  "policy_id": "uuid",
  "alias": "Business Travel Policy 2024",
  "title": "Business Travel Reimbursement Policy",
  "reimbursable_category": ["Air Transportation", "Hotel Accommodation"],
  "overview_summary": "This policy governs...",
  "status": "ACTIVE"
}
```

---

## Workflow 2 — Multi-Receipt OCR (Parallel)

**Trigger**: `POST /api/v1/documents/upload`
**File**: `backend/engine/agents/document_agent.py`
**Pattern**: `process_receipts()` with `ThreadPoolExecutor` for parallel LLM calls + serial DB writes

### Flow

```
[Upload 1..N files]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│  Query active policies → build categories list         │
│  (used for LLM category matching)                      │
└──────────────────────────┬─────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │  ThreadPoolExecutor     │  (up to 4 workers)
              │  per file in parallel:  │
              │                         │
              │  if image:              │
              │    _ocr_image()         │
              │    Vision LLM + base64  │
              │                         │
              │  if PDF:                │
              │    pymupdf4llm → text   │
              │    _ocr_pdf()           │
              │    Text LLM (JSON mode) │
              │                         │
              │  Both use same          │
              │  RECEIPT_OCR_PROMPT +   │
              │  injected categories    │
              └────────────┬────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  _is_unreadable() check per receipt                    │
│  • If all key fields are null/default → warning added  │
│                                                        │
│  _build_warnings() per receipt                         │
│  • confidence < 0.7                                    │
│  • Missing required fields                             │
│  • Images: visual anomaly check                        │
│  • PDFs: "standard visual anomaly detection bypassed"  │
│  • Receipt name ≠ employee name                        │
│                                                        │
│  Receipts WITH warnings → skipped_receipts[]           │
│  Receipts WITHOUT warnings → receipts[] (template)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Serial DB writes (thread-safe)                        │
│  • SupportingDocument row per file (all receipts)      │
│  • TravelSettlement row (receipts[], totals,           │
│    employee context, all_category, main_category)      │
│  • SupportingDocument.settlement_id ← settlement.id   │
│  • session.commit()                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### Unreadability Check

A receipt is marked unreadable if ALL of the following are absent/null/default:
`merchant_name`, `date`, `total_amount`, `currency`, `receipt_number`, `items_summary`

An "unreadable" warning is added and the receipt is excluded from the template (still saved to DB).

### OCR Prompt Behaviour

- **Missing fields**: LLM returns `"Not found in Receipt"` for all missing string fields
- **Category**: LLM selects from the injected active policy categories, or `"No Reimbursement Policy for this receipt"`
- All fields stored in `supporting_documents.extracted_data` JSONB

### Expense Column Mapping

| Category keyword contains | → Column |
|---------------------------|----------|
| transport, travel, air, flight, taxi, ... | transportation |
| hotel, accommodation, lodging, ... | accommodation |
| meal, food, dining, restaurant, ... | meals |
| anything else | others |

### HTML-to-PDF Settlement Form

```python
from engine.tools.generate_reimbursement_template import generate_reimbursement_template
generate_reimbursement_template(aggregated_results, output_path)
```

- Module: `backend/engine/tools/generate_reimbursement_template.py`
- Template: `backend/engine/templates/reimbursement_template.html` (Jinja2)
- Renderer: `xhtml2pdf` (pure Python)
- API: `POST /api/v1/documents/generate-template`

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `supporting_documents` | user_id, name, path, type, is_main=True (default), document_class="RECEIPT", extracted_data, settlement_id |
| `travel_settlements` | employee context, all_category, main_category, receipts (template-only), totals, currency |

### API Output

```json
{
  "settlement_id": "uuid",
  "document_ids": ["uuid1", "uuid2", "uuid3"],
  "employee": { "name": "John Doe", "id": "uuid", "department": "", "purpose": "Air Transportation, Meals" },
  "receipts": [
    {
      "document_id": "uuid1",
      "date": "2026-04-20",
      "description": "AirAsia - Air Travel",
      "category": "Air Transportation",
      "currency": "MYR",
      "amount": 350.00,
      "transportation": 350.00,
      "accommodation": 0.0,
      "meals": 0.0,
      "others": 0.0,
      "warnings": []
    }
  ],
  "skipped_receipts": [
    {
      "document_id": "uuid3",
      "description": "unnamed_upload",
      "warnings": ["Receipt is unreadable or contains no extractable data."]
    }
  ],
  "totals": {
    "transportation": 350.00,
    "accommodation": 0.0,
    "meals": 25.50,
    "others": 0.0,
    "grand_total": 375.50,
    "currency": "MYR"
  },
  "all_category": ["Air Transportation", "Meals"],
  "main_category": "Air Transportation",
  "all_warnings": []
}
```

---

## Workflow 3 — Compliance Analysis

**Trigger**: `POST /api/v1/reimbursements/analyze`
**File**: `backend/engine/agents/compliance_agent.py`
**LangGraph**: Sequential 3-node pipeline (direct LLM evaluation + policy RAG text search)
**Requires**: `settlement_id` from Workflow 2

### Flow

```
[START]
   │
   ▼
┌────────────────────────────────────────────────────────┐
│  Node 1: load_context                                  │
│  • Fetch User (name, department, rank)                 │
│  • Fetch Policy, parse mandatory_conditions JSON       │
│  • Resolve all_category from TravelSettlement          │
│  • Combine conditions from ALL categories (deduped)    │
│  • search_policy_sections() — keyword RAG              │
│    (retrieves policy text for amount/limit lookup)     │
│  • Fetch main receipt OCR data (is_main=True)          │
│  State: user, policy, all_category, combined_conditions│
│         policy_sections_text, receipt_extracted_data   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 2: check_conditions  (single LLM call)           │
│  • AGENT_EVALUATION_PROMPT with all context injected:  │
│    - combined_conditions                               │
│    - policy_sections_text (RAG excerpts)               │
│    - receipt OCR data                                  │
│    - employee rank + department                        │
│  • LLM executes in one pass:                           │
│    1. chain_of_thought: per-condition PASS/FAIL/MANUAL │
│    2. amount: {category: {original, reimbursement}}    │
│       (determined from policy sections by rank)        │
│    3. confidence: 0.0–1.0                              │
│    4. judgment: APPROVE / FLAG / MANUAL REVIEW         │
│    5. summary: 2-3 sentence explanation                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 3: save_reimbursement                            │
│  • Creates Reimbursement row (status="REVIEW")         │
│    - amount stored as JSONB {category: {orig, reimb}}  │
│    - confidence stored as FLOAT                        │
│    - settlement_id FK linked                           │
│  • Updates SupportingDocument.reim_id for all docs     │
│  • Back-links TravelSettlement.reimbursement_id        │
│  • session.commit()                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### Policy RAG Tool

File: `backend/engine/tools/rag_tool.py`

```python
search_policy_sections(policy_id, session, keywords, limit=8) → str
```

- No embeddings (pgvector retired); uses keyword ILIKE matching against `policy_sections.content`
- Returns concatenated excerpts (up to 1500 chars per section) injected into the LLM prompt
- Keywords: category names + ["amount", "limit", "rate", "maximum"]

### LLM Instances Used

| Instance | Model | Mode | Used For |
|----------|-------|------|----------|
| `get_chat_llm()` | ilmu-glm-5.1 (ILMU API) | JSON mode | check_conditions (single combined call) |

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `reimbursements` | user_id, policy_id, settlement_id, main_category, sub_category, employee_department, employee_rank, currency, amount (JSONB), confidence (FLOAT), judgment, status="REVIEW", chain_of_thought (JSONB), summary |
| `supporting_documents` | reim_id (updated for all input document_ids) |
| `travel_settlements` | reimbursement_id (back-linked after reim created) |

### API Input

```http
POST /api/v1/reimbursements/analyze
Authorization: Bearer <Employee token>
Content-Type: application/json

{
  "document_ids": ["uuid-receipt1", "uuid-receipt2"],
  "settlement_id": "uuid-from-wf2",
  "policy_id": "uuid-policy",
  "main_category": "Business Travel",
  "sub_category": "Air Transportation",
  "all_category": ["Air Transportation", "Meals"]
}
```

Note: `all_category` is optional — auto-derived from the `TravelSettlement` if omitted.

### API Output

```json
{
  "reim_id": "uuid",
  "settlement_id": "uuid",
  "judgment": "APPROVE",
  "status": "REVIEW",
  "confidence": 0.87,
  "summary": "All conditions satisfied. Economy class confirmed. Amount within policy limits.",
  "chain_of_thought": {
    "Economy class for all employees": { "flag": "PASS", "reason": "AirAsia economy confirmed.", "note": "" },
    "Prior approval required": { "flag": "PASS", "reason": "Approval form present in supporting docs.", "note": "" }
  },
  "amount": {
    "Air Transportation": {
      "original_amount": 350.00,
      "reimbursement": 350.00
    },
    "Meals": {
      "original_amount": 25.50,
      "reimbursement": 20.00
    }
  },
  "currency": "MYR"
}
```

---

## LangSmith Tracing

All workflows are automatically traced when these env vars are set in `backend/.env`:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=um_hackathon
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

**View at**: https://smith.langchain.com → project `um_hackathon`

---

## LLM Models Used

| Model | Provider | Used For |
|-------|----------|----------|
| `ilmu-glm-5.1` | ILMU API | Policy extraction, compliance evaluation (all-in-one) |
| `meta-llama/llama-3.2-11b-vision-instruct` | OpenRouter | Receipt image OCR (Vision LLM) |
| `ilmu-glm-5.1` (text/JSON mode) | ILMU API | PDF receipt text extraction |

---

## File Storage Layout

```
backend/storage/
├── policies/           # HR uploaded policy PDFs
│   └── *.pdf
└── documents/          # Employee uploaded receipts
    └── {user_id}/
        ├── *.jpg / *.pdf / *.png
        └── reimbursement_settlement.pdf   ← generated by generate-template
```

---

## Running the Backend

```bash
# Ensure Docker DB is running
docker compose up -d db

# Start backend
cd backend && uv run uvicorn main:app --reload --port 8000

# Demo UI:   http://localhost:8000/test/demo
# DB Viewer: http://localhost:8000/test/
# Swagger:   http://localhost:8000/docs
```

## DB Migrations (run once)

```sql
-- After 2026-04-23 refactor: remove RAG embeddings
DROP TABLE IF EXISTS supporting_documents_embeddings;
ALTER TABLE policy_sections DROP COLUMN IF EXISTS embedding;

-- After 2026-04-23 Phase 2 refactor: new schema
-- (already applied; kept here for reference)
-- CREATE TABLE travel_settlements (...);
-- ALTER TABLE reimbursements ADD COLUMN settlement_id UUID REFERENCES travel_settlements;
-- ALTER TABLE reimbursements ALTER COLUMN amount TYPE JSONB USING jsonb_build_object('total', amount::text);
-- ALTER TABLE reimbursements ADD COLUMN confidence FLOAT;
-- ALTER TABLE supporting_documents ADD COLUMN settlement_id UUID REFERENCES travel_settlements;
-- ALTER TABLE travel_settlements ADD CONSTRAINT fk_settlement_reim_id FOREIGN KEY (reimbursement_id) REFERENCES reimbursements(reim_id) DEFERRABLE INITIALLY DEFERRED;
```
