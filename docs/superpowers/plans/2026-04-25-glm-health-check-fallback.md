# GLM Health Check with OpenRouter Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On startup, ping GLM 5.1 with a 15-second timeout; if unreachable, silently switch all text LLM clients to `google/gemini-3.1-flash-lite-preview` via OpenRouter and log the switch to stdout.

**Architecture:** A module-level `_use_fallback` flag in `engine/llm.py` is set during `check_glm_health()`, which runs synchronously in the FastAPI `lifespan` hook before any request is served. The three GLM-backed LLM factory functions (`get_chat_llm`, `get_agent_llm`, `get_text_llm`) read the flag at first construction; `lru_cache` ensures they are built once and never re-evaluated mid-request.

**Tech Stack:** FastAPI lifespan, LangChain `ChatOpenAI`, Python `logging`, `unittest.mock` for tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/engine/llm.py` | Modify | Add `_use_fallback` flag, `FALLBACK_MODEL` constant, `check_glm_health()`, update three factory functions |
| `backend/main.py` | Modify | Call `check_glm_health()` inside `lifespan` |
| `backend/tests/test_llm_health.py` | Create | Unit tests for health check and factory function fallback behavior |

---

### Task 1: Write failing tests for `check_glm_health` and fallback factory behavior

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_llm_health.py`

- [ ] **Step 1: Create the tests package**

```bash
mkdir -p backend/tests
touch backend/tests/__init__.py
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_llm_health.py`:

```python
import logging
import pytest
from unittest.mock import patch, MagicMock
import httpx

import engine.llm as llm_module


@pytest.fixture(autouse=True)
def reset_llm_state():
    """Reset module-level flag and LRU caches between tests."""
    llm_module._use_fallback = False
    llm_module.get_chat_llm.cache_clear()
    llm_module.get_agent_llm.cache_clear()
    llm_module.get_text_llm.cache_clear()
    yield
    llm_module._use_fallback = False
    llm_module.get_chat_llm.cache_clear()
    llm_module.get_agent_llm.cache_clear()
    llm_module.get_text_llm.cache_clear()


def test_check_glm_health_success_keeps_primary(caplog):
    """GLM responds → _use_fallback stays False, INFO logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.return_value = MagicMock(content="Hello!")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.INFO, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is False
    assert "reachable" in caplog.text.lower()


def test_check_glm_health_timeout_sets_fallback(caplog):
    """GLM times out → _use_fallback set True, WARNING logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.side_effect = httpx.TimeoutException("timeout")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.WARNING, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is True
    assert "fallback" in caplog.text.lower()


def test_check_glm_health_error_sets_fallback(caplog):
    """Any other exception → _use_fallback set True, WARNING logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.side_effect = Exception("connection refused")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.WARNING, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is True


def test_get_chat_llm_uses_fallback_when_flag_set():
    """get_chat_llm() uses OpenRouter + FALLBACK_MODEL when _use_fallback is True."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        llm_module._use_fallback = True
        llm_module.get_chat_llm()
        call_kwargs = MockChatOpenAI.call_args.kwargs
        assert call_kwargs["model"] == llm_module.FALLBACK_MODEL
        assert "openrouter" in call_kwargs["base_url"]


def test_get_chat_llm_uses_glm_when_flag_not_set():
    """get_chat_llm() uses GLM base_url when _use_fallback is False."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        llm_module._use_fallback = False
        llm_module.get_chat_llm()
        call_kwargs = MockChatOpenAI.call_args.kwargs
        assert call_kwargs["model"] != llm_module.FALLBACK_MODEL
        assert "openrouter" not in call_kwargs["base_url"]
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
uv run pytest tests/test_llm_health.py -v
```

Expected: All tests FAIL — `check_glm_health` does not exist yet.

---

### Task 2: Implement the health check and fallback flag in `engine/llm.py`

**Files:**
- Modify: `backend/engine/llm.py`

- [ ] **Step 1: Replace `backend/engine/llm.py` with the updated implementation**

```python
import logging
from functools import lru_cache

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MODEL = "google/gemini-3.1-flash-lite-preview"

_use_fallback: bool = False


def check_glm_health() -> None:
    """Ping GLM 5.1 at startup. Sets _use_fallback=True if unreachable within 15s."""
    global _use_fallback
    probe = ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        model=settings.CHAT_MODEL,
        timeout=15,
    )
    try:
        probe.invoke([HumanMessage(content="Hi")])
        logger.info("GLM 5.1 is reachable. Using primary LLM provider.")
    except Exception as exc:
        _use_fallback = True
        logger.warning(
            "GLM 5.1 unreachable (%s). Falling back to %s via OpenRouter.",
            exc,
            FALLBACK_MODEL,
        )


@lru_cache(maxsize=1)
def get_chat_llm() -> ChatOpenAI:
    """JSON-mode LLM for text tasks (policy extraction, compliance)."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY,
            model=FALLBACK_MODEL,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        model=settings.CHAT_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


@lru_cache(maxsize=1)
def get_vision_llm() -> ChatOpenAI:
    """Vision LLM for receipt OCR — no JSON mode."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.VISION_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


@lru_cache(maxsize=1)
def get_agent_llm() -> ChatOpenAI:
    """LLM for tool-calling agent — no JSON mode (required for bind_tools)."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY,
            model=FALLBACK_MODEL,
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        model=settings.CHAT_MODEL,
    )


@lru_cache(maxsize=1)
def get_text_llm() -> ChatOpenAI:
    """Text LLM for PDF receipt extraction — JSON mode enabled."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY,
            model=FALLBACK_MODEL,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        model=settings.CHAT_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """Text embeddings via OpenRouter (openai/text-embedding-3-small, 1536 dims)."""
    return OpenAIEmbeddings(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.EMBEDDING_MODEL,
    )
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd backend
uv run pytest tests/test_llm_health.py -v
```

Expected output:
```
PASSED tests/test_llm_health.py::test_check_glm_health_success_keeps_primary
PASSED tests/test_llm_health.py::test_check_glm_health_timeout_sets_fallback
PASSED tests/test_llm_health.py::test_check_glm_health_error_sets_fallback
PASSED tests/test_llm_health.py::test_get_chat_llm_uses_fallback_when_flag_set
PASSED tests/test_llm_health.py::test_get_chat_llm_uses_glm_when_flag_not_set
```

- [ ] **Step 3: Commit**

```bash
git add backend/engine/llm.py backend/tests/__init__.py backend/tests/test_llm_health.py
git commit -m "feat(llm): add GLM health check with OpenRouter fallback on startup"
```

---

### Task 3: Wire `check_glm_health()` into FastAPI lifespan

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add the import and call to `lifespan`**

In `backend/main.py`, add the import at the top (after existing engine/db imports):

```python
from engine.llm import check_glm_health
```

Replace the existing `lifespan` function:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    check_glm_health()
    yield
    engine.dispose()
```

- [ ] **Step 2: Start the server and verify the log appears**

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

Expected log line (GLM reachable):
```
INFO     engine.llm:llm.py:XX GLM 5.1 is reachable. Using primary LLM provider.
```

Or if GLM is down:
```
WARNING  engine.llm:llm.py:XX GLM 5.1 unreachable (...). Falling back to google/gemini-3.1-flash-lite-preview via OpenRouter.
```

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat(main): call GLM health check on startup via lifespan hook"
```
