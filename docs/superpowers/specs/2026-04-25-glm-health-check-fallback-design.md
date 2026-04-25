---
title: GLM Health Check with OpenRouter Fallback
date: 2026-04-25
status: approved
---

## Overview

At application startup, the backend sends a lightweight "Hi" message to the GLM 5.1 API (ILMU). If GLM does not respond within 15 seconds, it is assumed to be down and the system switches all text LLM calls to `google/gemini-3.1-flash-lite-preview` via OpenRouter for the lifetime of that process. The switch is logged to stdout so it is visible in Docker logs.

## Scope

Only the three GLM-backed LLM factory functions are affected:
- `get_chat_llm()` — JSON-mode LLM for policy extraction and compliance
- `get_agent_llm()` — tool-calling LLM
- `get_text_llm()` — JSON-mode LLM for PDF receipt extraction

`get_vision_llm()` already uses OpenRouter and is unaffected.

## Changes

### `backend/engine/llm.py`

1. Add module-level flag: `_use_fallback: bool = False`
2. Add constant: `FALLBACK_MODEL = "google/gemini-3.1-flash-lite-preview"`
3. Add `check_glm_health()` function:
   - Creates a temporary (non-cached) `ChatOpenAI` client pointed at GLM with `timeout=15`
   - Sends `[HumanMessage("Hi")]`
   - On success: logs `INFO` — "GLM 5.1 is reachable. Using primary LLM provider."
   - On any exception (timeout, connection error, API error): sets `_use_fallback = True`, logs `WARNING` — "GLM 5.1 unreachable. Falling back to google/gemini-3.1-flash-lite-preview via OpenRouter."
4. Modify `get_chat_llm()`, `get_agent_llm()`, `get_text_llm()`: if `_use_fallback` is True, instantiate with `OPENROUTER_BASE_URL`, `OPENROUTER_API_KEY`, `FALLBACK_MODEL`; otherwise use existing GLM config.

`lru_cache` ensures clients are built once. Because `check_glm_health()` runs at startup before any request, the flag is set before any client is ever constructed.

### `backend/main.py`

In the `lifespan` async context manager, call `check_glm_health()` after `init_db()` and before `yield`.

```python
from engine.llm import check_glm_health

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    check_glm_health()
    yield
    engine.dispose()
```

## Logging

All logs go to stdout via Python's `logging` module, which Docker captures automatically.

| Event | Level | Message |
|-------|-------|---------|
| GLM responds within 15s | INFO | `GLM 5.1 is reachable. Using primary LLM provider.` |
| GLM timeout / error | WARNING | `GLM 5.1 unreachable. Falling back to google/gemini-3.1-flash-lite-preview via OpenRouter.` |

## Timeout

15 seconds — generous enough for cross-region (MY→CN) latency on a healthy server; tight enough to avoid a long startup delay when GLM is down.

## Constraints

- The fallback is **process-lifetime only**. If GLM recovers, a server restart is required to re-enable it.
- The health check is **synchronous** (blocking) during startup. This is acceptable because it runs before the server accepts requests.
- No new dependencies required — `langchain_openai` and `httpx` are already present.
