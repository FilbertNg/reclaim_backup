# SAD Mermaid Diagrams

All diagrams correspond to sections in `SAD_Report.md`. Each diagram is self-contained and can be rendered in any Mermaid-compatible viewer (GitHub, Notion, Obsidian, etc.).

---

## Diagram 1: System Dependency Map (Section 2.1.3)

```mermaid
graph TD
    FE["<b>Next.js Frontend</b><br/>Employee Portal / HR Portal<br/>React 19 · Tailwind CSS 4 · Axios"]
    BE["<b>FastAPI Backend</b><br/>Python 3.13 · Uvicorn · Port 8000"]

    FE <-->|"REST API /api/v1\nJWT Bearer Auth on all routes"| BE

    BE --> AgentLayer
    BE --> PG

    subgraph AgentLayer["🤖 LangGraph Agent Layer"]
        PA["Policy Agent<br/>(4 nodes)"]
        DA["Document Agent<br/>(parallel ThreadPoolExecutor)"]
        CA["Compliance Agent<br/>(5 nodes · ReAct)"]
    end

    subgraph PG["🐘 PostgreSQL 16 — Docker Container"]
        T1["employees"]
        T2["policies"]
        T3["policy_sections"]
        T4["travel_settlements"]
        T5["reimbursements"]
        T6["supporting_documents"]
    end

    PA -->|"DB write → policies"| PG
    DA -->|"DB write → supporting_documents\ntravel_settlements"| PG
    CA -->|"DB write → reimbursements"| PG

    subgraph LLMServices["☁️ External LLM Services"]
        ILMU["ILMU API<br/><b>GLM-5.1</b><br/>Text · Chat · JSON mode · ReAct"]
        OR["OpenRouter<br/><b>Llama 3.2 Vision 11B</b><br/>Image OCR<br/><b>text-embed-3-small</b><br/>Policy section embeddings (1536-dim)"]
    end

    PA -->|"2× Chat LLM calls\ncategory + conditions"| ILMU
    DA -->|"PDF path → JSON mode"| ILMU
    DA -->|"Image path → multimodal"| OR
    PA -->|"Batch embedding\n(policy sections)"| OR
    CA -->|"N+1 ReAct agents"| ILMU
    CA -->|"RAG query embedding\n(search_policy_rag)"| OR

    AgentLayer -->|"Auto-traced via\nLANGCHAIN_TRACING_V2"| LS["LangSmith\nObservability\nProject: um_hackathon"]

    style FE fill:#1e3a5f,color:#fff
    style BE fill:#1e3a5f,color:#fff
    style AgentLayer fill:#1a1a2e,color:#fff
    style PG fill:#2d4a22,color:#fff
    style LLMServices fill:#4a1e2e,color:#fff
    style LS fill:#3a3a1e,color:#fff
```

---

## Diagram 2: Context Window Flow per LLM Call (Section 2.1.3)

```mermaid
flowchart TD
    subgraph W1["Workflow 1 — Policy Agent"]
        N2["Node 2: extract_categories_and_summary\nInput: policy markdown ≤80k chars\n+ POLICY_CATEGORY_SUMMARY_PROMPT\nOutput: title, categories[], overview_summary"]
        N3["Node 3: extract_conditions\nInput: categories[] + markdown ≤80k chars\n+ POLICY_CONDITIONS_PROMPT\nOutput: mandatory_conditions JSON"]
        N5["Node 5: embed_and_save_sections\nNo LLM prompt — batch embedding call\nModel: text-embedding-3-small (OpenRouter)\nInput: markdown chunks ~1000 chars each\nOutput: PolicySection rows with 1536-dim vectors"]
        N2 --> N3 --> N5
    end

    subgraph W2["Workflow 2 — Document Agent (parallel, ≤4 workers)"]
        IMG["Image receipt\nInput: base64 image + OCR prompt\n+ active category list\nModel: Llama 3.2 Vision\nOutput: extracted_data JSON"]
        PDF["PDF receipt\nInput: PyMuPDF4LLM markdown ≤8000 chars\n+ OCR prompt + categories\nModel: GLM-5.1 JSON mode\nOutput: extracted_data JSON"]
    end

    subgraph W3["Workflow 3 — Compliance Agent"]
        PER["Per-receipt ReAct agents (parallel, ≤4 workers)\nInput: employee context + single receipt JSON\n+ mandatory_conditions + currency\nTools: get_current_date, search_policy_rag\n  (pgvector cosine search + keyword fallback)\nMax tool calls: 5\nModel: GLM-5.1 (tool-calling)\nOutput: line_item JSON per receipt"]
        FINAL["Final judgment ReAct agent (single)\nInput: all line_items[] + totals dict\n+ policy overview ≤150 words\nTools: search_policy_rag\n  (pgvector cosine search + keyword fallback)\nMax tool calls: 3\nModel: GLM-5.1 (tool-calling)\nOutput: judgment, confidence, summary"]
        PER --> FINAL
    end

    W1 --> DB1["DB: policies table\npolicy_sections table (with embeddings)"]
    W2 --> DB2["DB: supporting_documents\ntravel_settlements"]
    W3 --> DB3["DB: reimbursements"]
```

---

## Diagram 3: Sequence Diagram — End-to-End Claim Submission Flow (Section 2.1.4)

```mermaid
sequenceDiagram
    actor Employee as Employee Portal
    participant API as FastAPI Backend
    participant DocAgent as Document Agent
    participant CompAgent as Compliance Agent
    actor HR as HR Portal

    Employee->>API: POST /api/v1/auth/login
    API-->>Employee: JWT access_token

    Employee->>API: POST /api/v1/documents/upload<br/>(multipart: 1–10 receipt files)
    API->>DocAgent: process_receipts(files, user_id, employee_name, session)

    par Parallel OCR (≤4 workers)
        DocAgent->>DocAgent: Images → Llama 3.2 Vision (OpenRouter)
        DocAgent->>DocAgent: PDFs → GLM-5.1 JSON mode (ILMU API)
    end

    DocAgent->>DocAgent: Warnings check per receipt
    DocAgent->>DocAgent: Save supporting_documents rows (serial)
    DocAgent->>DocAgent: Create travel_settlements row
    DocAgent-->>API: settlement_id, receipts[], totals
    API-->>Employee: DocumentUploadResponse

    Note over Employee: Employee reviews verification screen

    opt Employee corrects OCR errors
        Employee->>API: POST /api/v1/documents/{document_id}/edits
        API->>API: detect_changes(original, edited) → change_summary
        API->>API: Set human_edited=True, overall_risk level
        API-->>Employee: EditDocumentResponse
    end

    Employee->>API: POST /api/v1/reimbursements/analyze<br/>{settlement_id, policy_id, all_category[]}
    API->>CompAgent: run_compliance_workflow(settlement_id, policy_id, ...)

    CompAgent->>CompAgent: load_context — DB: User, Policy, Settlement<br/>Enrich receipts with human_edit metadata

    par Per-receipt ReAct agents (parallel, ≤4 workers)
        CompAgent->>CompAgent: GLM-5.1 ReAct × N<br/>check eligibility, caps, late submission
    end

    CompAgent->>CompAgent: aggregate_totals — sum line_items

    CompAgent->>CompAgent: final_judgment — GLM-5.1 ReAct × 1<br/>overall judgment + confidence + summary

    CompAgent->>CompAgent: save_reimbursement → DB: reimbursements

    CompAgent-->>API: reim_id, judgment, line_items[], totals, confidence
    API-->>Employee: AnalyzeResponse

    Note over Employee: Claim enters HR queue (status = REVIEW)

    HR->>API: GET /api/v1/reimbursements
    API-->>HR: Claims bucketed by AI judgment<br/>"Requires Attention" / "Passed AI Review"

    Note over HR: HR reviews full audit trail

    HR->>API: PATCH /api/v1/reimbursements/{reim_id}/status<br/>{status: APPROVED | REJECTED}
    API->>API: Role check (HR only) → update status
    API-->>HR: Updated reimbursement record
```

---

## Diagram 4: Data Flow Diagram — Level 1 (Section 2.3.1.1)

```mermaid
flowchart TD
    EMP(["👤 Employee"])
    HR(["👔 HR"])
    LLMAPI(["☁️ LLM APIs\nILMU · OpenRouter"])

    subgraph FastAPI["FastAPI Application — Correct Operational Order"]
        P5["① P5: Policy Management\nPOST /policies/upload\n→ Policy Agent\n(HR must run this FIRST)"]
        P1["② P1: Auth Management\nlogin · register · JWT issue"]
        P2["③ P2: Receipt Ingestion\nPOST /documents/upload\nPOST /documents/{id}/edits\n→ Document Agent"]
        P3["④ P3: Compliance Analysis\nPOST /reimbursements/analyze\n→ Compliance Agent\n(requires policy from P5 + settlement from P2)"]
        P4["⑤ P4: HR Decision Processing\nPATCH /reimbursements/{id}/status\n(HR role enforced)"]
    end

    subgraph DB[("🐘 PostgreSQL — Data Stores")]
        D1["D1: employees"]
        D2["D2: policies"]
        D3["D3: policy_sections\n(1536-dim embeddings)"]
        D4["D4: travel_settlements"]
        D5["D5: reimbursements"]
        D6["D6: supporting_documents"]
    end

    HR -->|"① policy PDFs + alias"| P5
    P5 <-->|"Chat LLM × 2 calls\n+ Embedding LLM (batch)"| LLMAPI
    P5 -->|"write policies"| D2
    P5 -->|"write sections\n+ embeddings"| D3

    EMP -->|"② email + password"| P1
    P1 -->|"read"| D1

    P1 -->|"JWT token"| P2
    EMP -->|"③ receipt files\n(JPEG/PNG/PDF)"| P2
    EMP -->|"edited field values"| P2
    P2 <-->|"Vision LLM (images)\nText LLM (PDFs)"| LLMAPI
    P2 -->|"read user context"| D1
    P2 -->|"write"| D6
    P2 -->|"write"| D4

    EMP -->|"④ settlement_id, policy_id"| P3
    D2 -->|"read active policy\n+ conditions"| P3
    D3 -->|"RAG: cosine vector search"| P3
    D4 -->|"read settlement basket"| P3
    P3 <-->|"Chat LLM ReAct × N+1\n+ Embedding LLM (RAG queries)"| LLMAPI
    P3 -->|"write"| D5
    P3 -->|"judgment, line_items"| EMP

    HR -->|"⑤ APPROVED / REJECTED"| P4
    P4 -->|"read + write status"| D5
    P4 -->|"final decision"| HR

    style FastAPI fill:#1a2a4a,color:#fff
    style DB fill:#1a3a1a,color:#fff
    style P5 fill:#2a4a1a,color:#fff
```

---

## Diagram 5: Entity Relationship Diagram — Normalized Database Schema (Section 2.3.2)

```mermaid
erDiagram
    employees {
        UUID user_id PK
        string email "unique"
        string hashed_password
        string name
        string role "HR | Employee"
        string department "nullable"
        int rank "default 1, nullable"
        string privilege_level "default Standard, nullable"
        string user_code "nullable"
    }

    policies {
        UUID policy_id PK
        string alias
        string title
        jsonb reimbursable_category "List[str]"
        datetime effective_date
        text overview_summary
        text mandatory_conditions "JSON-serialized dict"
        string source_file_url
        string status "ACTIVE | DRAFT | ARCHIVED"
        datetime created_at
    }

    policy_sections {
        UUID section_id PK
        UUID policy_id FK
        text content "markdown chunk ~1000 chars"
        jsonb metadata_data "source_file, chunk_index"
        vector embedding "pgvector 1536-dim ACTIVE for RAG"
    }

    travel_settlements {
        UUID settlement_id PK
        UUID reimbursement_id FK "deferred FK to reimbursements, nullable"
        string employee_id "plain str — NOT a FK, denormalized copy of user_id"
        string employee_name "nullable"
        string employee_code "nullable"
        string employee_department "nullable"
        int employee_rank "nullable"
        string destination "nullable"
        string departure_date "nullable"
        string arrival_date "nullable"
        string location "nullable"
        bool overseas "nullable"
        string purpose "nullable"
        string currency "nullable"
        string document_path "nullable"
        jsonb receipts "List of extracted receipt dicts"
        jsonb totals "transportation, accommodation, meals, others, grand_total, currency"
        jsonb all_category "List[str] unique categories"
        string main_category "most frequent category, nullable"
        datetime created_at
    }

    reimbursements {
        UUID reim_id PK
        UUID user_id FK
        UUID policy_id FK "nullable"
        UUID settlement_id FK "nullable"
        string main_category
        jsonb sub_category "List[str]"
        string employee_department "nullable"
        int employee_rank "default 1"
        string currency
        jsonb totals "total_requested, total_deduction, net_approved, by_category"
        jsonb line_items "List of per-receipt AI verdicts"
        string judgment "APPROVE | REJECT | PARTIAL_APPROVE | MANUAL REVIEW"
        float confidence "0.0 to 1.0, nullable"
        text summary
        string status "REVIEW | APPROVED | REJECTED | PAID, default REVIEW"
        datetime created_at
        datetime updated_at
    }

    supporting_documents {
        UUID document_id PK
        UUID reim_id FK "nullable"
        UUID settlement_id FK "nullable"
        UUID user_id FK
        text name "original filename"
        string path "relative storage path"
        string type "image | pdf"
        bool is_main "default true"
        string document_class "default RECEIPT"
        jsonb extracted_data "OCR output from LLM"
        jsonb editable_fields "human corrections"
        bool human_edited "default false"
        jsonb change_summary "has_changes, overall_risk, changes_by_field"
        datetime created_at
    }

    employees ||--o{ reimbursements : "FK user_id"
    employees ||--o{ supporting_documents : "FK user_id"
    policies ||--o{ policy_sections : "FK policy_id"
    policies ||--o{ reimbursements : "FK policy_id (nullable)"
    reimbursements ||--o{ supporting_documents : "FK reim_id (nullable)"
    reimbursements ||--o| travel_settlements : "FK reimbursement_id deferred"
    travel_settlements ||--o{ supporting_documents : "FK settlement_id (nullable)"
    reimbursements }o--|| travel_settlements : "FK settlement_id (nullable)"
```

> **Note on `travel_settlements.employee_id`**: This is a plain `str` column — it stores a copy of the user's UUID as a string for PDF template rendering, but carries **no FK constraint** in the database. The formal relationship between employees and their travel settlements is tracked via `reimbursements.user_id → employees.user_id`.

---

## Diagram 6: AI Agent Workflow — LangGraph Node Pipelines (Reference)

```mermaid
flowchart LR
    subgraph W1["Workflow 1 — Policy Agent (HR uploads policy PDF)"]
        direction LR
        A1["process_pdfs\nPyMuPDF4LLM\n→ markdown"] --> A2["extract_categories\n_and_summary\nGLM-5.1\n→ title, categories[]"] --> A3["extract_conditions\nGLM-5.1\n→ mandatory_conditions"] --> A4["save_to_db\n→ policies row"] --> A5["embed_and_save\n_sections\ntext-embed-3-small\n→ policy_sections rows\n  with 1536-dim vectors"]
    end

    subgraph W2["Workflow 2 — Document Agent (Employee uploads receipts)"]
        direction LR
        B1["Get Active\nCategories\nfrom DB"] --> B2["Parallel OCR\nThreadPoolExecutor\n≤4 workers"]
        B2 --> B3["Image → Llama\n3.2 Vision"]
        B2 --> B4["PDF → GLM-5.1\nJSON mode"]
        B3 & B4 --> B5["Warnings\nCheck"] --> B6["Save\nsupporting_documents\n(serial)"] --> B7["Create\ntravel_settlements"]
    end

    subgraph W3["Workflow 3 — Compliance Agent (Employee submits for analysis)"]
        direction LR
        C1["load_context\nDB: User,Policy\nSettlement\n+ human_edit"] --> C2["analyze_receipts\nParallel ReAct\n≤4 workers\nGLM-5.1 × N"] --> C3["aggregate_totals\nsum line_items\nby category"] --> C4["final_judgment\nReAct × 1\nGLM-5.1"] --> C5["save_reimbursement\n→ reimbursements row"]
    end

    style W1 fill:#1a2a4a,color:#fff
    style W2 fill:#2a1a4a,color:#fff
    style W3 fill:#1a3a2a,color:#fff
```
