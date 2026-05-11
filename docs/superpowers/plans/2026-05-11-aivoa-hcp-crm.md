# AI-First CRM HCP Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "Log Interaction Screen" for an AI-First Healthcare CRM — a sales rep can log HCP interactions through a structured form or a chat assistant, both routed through a single LangGraph agent owning 5 tools.

**Architecture:** Monorepo with `frontend/` (React + Redux + Vite) and `backend/` (FastAPI + LangGraph + Postgres). Form submits and chat messages both hit `POST /agent/invoke`; the agent decides which tool to call. Postgres runs in Docker.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, LangGraph, langchain-groq (Groq `gemma2-9b-it` + `llama-3.3-70b-versatile` fallback), PostgreSQL 16, React 18, Vite, TypeScript, Redux Toolkit, RTK Query, Tailwind, Google Inter.

**Spec:** `docs/superpowers/specs/2026-05-11-aivoa-hcp-crm-design.md`

---

## File Structure

### Backend (`backend/`)
| File | Responsibility |
|---|---|
| `pyproject.toml` | Deps + project meta |
| `.env.example` | `GROQ_API_KEY`, `DATABASE_URL` |
| `app/main.py` | FastAPI app factory + router registration |
| `app/config.py` | Settings via `pydantic-settings` |
| `app/db.py` | SQLAlchemy engine + `get_db` dep |
| `app/models.py` | ORM models (`HCP`, `Interaction`, `ChatMessage`) |
| `app/schemas.py` | Pydantic v2 request/response schemas |
| `app/routers/agent.py` | `POST /agent/invoke` |
| `app/routers/hcps.py` | `GET /hcps` |
| `app/routers/interactions.py` | `GET /interactions`, `GET /interactions/{id}` |
| `app/agent/llm.py` | Groq client + token-aware model router |
| `app/agent/prompts.py` | System prompts |
| `app/agent/tools.py` | 5 `@tool` functions |
| `app/agent/graph.py` | `StateGraph` build (agent_node + ToolNode) |
| `app/seeds/hcps.json` | 5 fake HCPs |
| `alembic/env.py` | Alembic config |
| `alembic/versions/0001_initial.py` | Initial migration |
| `tests/conftest.py` | Pytest fixtures (test DB, mocked Groq) |
| `tests/test_tools.py` | One happy-path test per tool |
| `tests/test_agent_e2e.py` | End-to-end with mocked LLM |

### Frontend (`frontend/`)
| File | Responsibility |
|---|---|
| `package.json` | Deps |
| `vite.config.ts` | Vite config + proxy to backend |
| `tailwind.config.js` | Tailwind config |
| `postcss.config.js` | PostCSS config |
| `tsconfig.json` | TS config |
| `index.html` | Loads Google Inter font |
| `src/main.tsx` | React root |
| `src/App.tsx` | Router |
| `src/store.ts` | Redux store |
| `src/index.css` | Tailwind base + Inter font-family |
| `src/api/apiSlice.ts` | RTK Query base |
| `src/api/hcps.ts` | HCP queries |
| `src/api/interactions.ts` | Interaction queries |
| `src/api/agent.ts` | `POST /agent/invoke` mutation |
| `src/features/interactionDraft/slice.ts` | Form draft slice |
| `src/features/chat/slice.ts` | Chat slice |
| `src/components/TopBar.tsx` | Header |
| `src/components/InteractionForm.tsx` | Left panel form |
| `src/components/AIAssistantPanel.tsx` | Right panel chat |
| `src/components/ToolCallBubble.tsx` | Tool-call visualization |
| `src/components/InteractionsTable.tsx` | Past interactions list |
| `src/pages/LogInteractionPage.tsx` | Main screen |
| `src/pages/InteractionsTablePage.tsx` | History |

### Root
| File | Responsibility |
|---|---|
| `docker-compose.yml` | Postgres service |
| `README.md` | Setup, run, tools list |
| `docs/demo-script.md` | 10-min video script |

---

## Task 1: Docker Compose + env scaffold

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/.env.example`
- Create: `.env` (gitignored, with real Groq key — user fills this)

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: aivoa
      POSTGRES_PASSWORD: aivoa
      POSTGRES_DB: aivoa
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "aivoa"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  pgdata:
```

- [ ] **Step 2: Write `backend/.env.example`**

```
GROQ_API_KEY=gsk_replace_me
DATABASE_URL=postgresql+psycopg://aivoa:aivoa@localhost:5433/aivoa
GROQ_MODEL=gemma2-9b-it
GROQ_FALLBACK_MODEL=llama-3.3-70b-versatile
```

- [ ] **Step 3: Bring Postgres up and verify**

```bash
docker compose up -d postgres
docker compose ps
```
Expected: `postgres` row shows `healthy`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/.env.example
git commit -m "chore: add docker-compose with postgres and env example"
```

---

## Task 2: Backend project scaffold + health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Write `backend/pyproject.toml`**

```toml
[project]
name = "aivoa-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi==0.115.0",
  "uvicorn[standard]==0.32.0",
  "pydantic==2.9.2",
  "pydantic-settings==2.6.0",
  "sqlalchemy==2.0.36",
  "psycopg[binary]==3.2.3",
  "alembic==1.13.3",
  "langgraph==0.2.45",
  "langchain-core==0.3.15",
  "langchain-groq==0.2.0",
  "python-multipart==0.0.12",
  "httpx==0.27.2",
]

[project.optional-dependencies]
dev = ["pytest==8.3.3", "pytest-asyncio==0.24.0", "pytest-mock==3.14.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Write `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str
    database_url: str
    groq_model: str = "gemma2-9b-it"
    groq_fallback_model: str = "llama-3.3-70b-versatile"


settings = Settings()
```

- [ ] **Step 3: Write `backend/app/__init__.py`**

```python
```
(empty file)

- [ ] **Step 4: Write `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AIVOA HCP CRM")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
```

- [ ] **Step 5: Install and run**

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate  # Windows
pip install -e ".[dev]"
cp .env.example .env  # then fill GROQ_API_KEY in .env
uvicorn app.main:app --reload --port 8000
```
Expected: `Uvicorn running on http://127.0.0.1:8000`.

- [ ] **Step 6: Hit healthz**

```bash
curl http://localhost:8000/healthz
```
Expected: `{"status":"ok"}`.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI with health endpoint"
```

---

## Task 3: SQLAlchemy models

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`

- [ ] **Step 1: Write `backend/app/db.py`**

```python
from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from app.config import settings


engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 2: Write `backend/app/models.py`**

```python
import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.db import Base


class Sentiment(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class HCP(Base):
    __tablename__ = "hcps"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    specialty: Mapped[str | None] = mapped_column(String(255))
    institution: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    interactions: Mapped[list["Interaction"]] = relationship(back_populates="hcp")


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hcp_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hcps.id"), nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(64), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    attendees: Mapped[str | None] = mapped_column(Text)
    topics_discussed: Mapped[str | None] = mapped_column(Text)
    materials_shared: Mapped[list | None] = mapped_column(JSON)
    samples_distributed: Mapped[list | None] = mapped_column(JSON)
    sentiment: Mapped[Sentiment | None] = mapped_column(Enum(Sentiment))
    outcomes: Mapped[str | None] = mapped_column(Text)
    follow_up_actions: Mapped[str | None] = mapped_column(Text)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    ai_suggestions: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    hcp: Mapped[HCP] = relationship(back_populates="interactions")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    tool_name: Mapped[str | None] = mapped_column(String(64))
    tool_args: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/db.py backend/app/models.py
git commit -m "feat(backend): add SQLAlchemy models for HCP, Interaction, ChatMessage"
```

---

## Task 4: Alembic initial migration + seed data

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/script.py.mako`
- Create: `backend/alembic/versions/` (dir)
- Create: `backend/app/seeds/hcps.json`
- Create: `backend/app/seeds/__init__.py`
- Create: `backend/scripts/seed.py`

- [ ] **Step 1: Init Alembic**

```bash
cd backend
alembic init alembic
```
Expected: creates `alembic.ini`, `alembic/env.py`, `alembic/versions/`.

- [ ] **Step 2: Patch `backend/alembic.ini`**

Replace the `sqlalchemy.url = ...` line with:
```
sqlalchemy.url =
```
(leave blank — we set it from env in `env.py`)

- [ ] **Step 3: Replace `backend/alembic/env.py` with:**

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app.config import settings
from app.db import Base
from app import models  # noqa: F401 register models

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
```

- [ ] **Step 4: Generate initial migration**

```bash
cd backend
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```
Expected: migration file appears in `alembic/versions/`, schema applied.

- [ ] **Step 5: Verify tables**

```bash
docker compose exec postgres psql -U aivoa -d aivoa -c "\dt"
```
Expected: `hcps`, `interactions`, `chat_messages`, `alembic_version`.

- [ ] **Step 6: Write `backend/app/seeds/hcps.json`**

```json
[
  {"name": "Dr. Aisha Sharma", "specialty": "Cardiology", "institution": "AIIMS Delhi"},
  {"name": "Dr. Rohan Mehta", "specialty": "Oncology", "institution": "Tata Memorial Mumbai"},
  {"name": "Dr. Priya Iyer", "specialty": "Endocrinology", "institution": "Apollo Chennai"},
  {"name": "Dr. Vikram Singh", "specialty": "Neurology", "institution": "Fortis Gurugram"},
  {"name": "Dr. Meera Nair", "specialty": "Pediatrics", "institution": "Manipal Bangalore"}
]
```

- [ ] **Step 7: Write `backend/app/seeds/__init__.py`** (empty file)

- [ ] **Step 8: Write `backend/scripts/seed.py`**

```python
import json
from pathlib import Path
from app.db import SessionLocal
from app.models import HCP

SEED_FILE = Path(__file__).parent.parent / "app" / "seeds" / "hcps.json"


def seed() -> None:
    db = SessionLocal()
    try:
        if db.query(HCP).count() > 0:
            print("HCPs already seeded — skipping.")
            return
        data = json.loads(SEED_FILE.read_text())
        for row in data:
            db.add(HCP(**row))
        db.commit()
        print(f"Seeded {len(data)} HCPs.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
```

- [ ] **Step 9: Run seed**

```bash
cd backend
python scripts/seed.py
```
Expected: `Seeded 5 HCPs.`

- [ ] **Step 10: Commit**

```bash
git add backend/alembic backend/alembic.ini backend/app/seeds backend/scripts
git commit -m "feat(backend): add alembic migrations and HCP seed data"
```

---

## Task 5: GET /hcps autocomplete endpoint

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/hcps.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_hcps.py`

- [ ] **Step 1: Write `backend/app/schemas.py`**

```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.models import Sentiment


class HCPOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    specialty: str | None = None
    institution: str | None = None


class InteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    hcp_id: UUID
    interaction_type: str
    occurred_at: datetime
    attendees: str | None = None
    topics_discussed: str | None = None
    materials_shared: list | None = None
    samples_distributed: list | None = None
    sentiment: Sentiment | None = None
    outcomes: str | None = None
    follow_up_actions: str | None = None
    ai_summary: str | None = None
    ai_suggestions: list | None = None
    created_at: datetime
    updated_at: datetime


class AgentInvokeRequest(BaseModel):
    session_id: str
    message: str
    mode: str = "chat"  # "chat" | "form"
    form_data: dict | None = None


class ToolCall(BaseModel):
    name: str
    args: dict
    result: dict | str | None = None


class AgentInvokeResponse(BaseModel):
    final_text: str
    tool_calls: list[ToolCall]
```

- [ ] **Step 2: Write `backend/app/routers/__init__.py`** (empty)

- [ ] **Step 3: Write `backend/app/routers/hcps.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import get_db
from app.models import HCP
from app.schemas import HCPOut

router = APIRouter(prefix="/hcps", tags=["hcps"])


@router.get("", response_model=list[HCPOut])
def list_hcps(q: str | None = None, db: Session = Depends(get_db)) -> list[HCP]:
    stmt = select(HCP)
    if q:
        stmt = stmt.where(HCP.name.ilike(f"%{q}%"))
    return list(db.execute(stmt.order_by(HCP.name).limit(20)).scalars())
```

- [ ] **Step 4: Modify `backend/app/main.py` to register router**

Add import:
```python
from app.routers import hcps
```
After CORS middleware:
```python
app.include_router(hcps.router)
```

- [ ] **Step 5: Write `backend/tests/__init__.py`** (empty)

- [ ] **Step 6: Write `backend/tests/conftest.py`**

```python
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.db import Base, get_db
from app.main import app
from app import models  # noqa: F401

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://aivoa:aivoa@localhost:5433/aivoa_test",
)


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, future=True)
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture
def db(engine):
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = TestingSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

- [ ] **Step 7: Create test database**

```bash
docker compose exec postgres psql -U aivoa -c "CREATE DATABASE aivoa_test;"
```
Expected: `CREATE DATABASE`. (If "already exists", continue.)

- [ ] **Step 8: Write `backend/tests/test_hcps.py`**

```python
from app.models import HCP


def test_list_hcps_filters_by_query(client, db):
    db.add(HCP(name="Dr. Test One", specialty="Cardiology"))
    db.add(HCP(name="Dr. Other", specialty="Oncology"))
    db.commit()

    r = client.get("/hcps?q=Test")
    assert r.status_code == 200
    names = [h["name"] for h in r.json()]
    assert "Dr. Test One" in names
    assert "Dr. Other" not in names


def test_list_hcps_no_query_returns_all(client, db):
    db.add(HCP(name="Dr. Alpha"))
    db.add(HCP(name="Dr. Beta"))
    db.commit()

    r = client.get("/hcps")
    assert r.status_code == 200
    assert len(r.json()) >= 2
```

- [ ] **Step 9: Run tests**

```bash
cd backend
pytest tests/test_hcps.py -v
```
Expected: 2 passed.

- [ ] **Step 10: Commit**

```bash
git add backend/app/schemas.py backend/app/routers backend/app/main.py backend/tests
git commit -m "feat(backend): add GET /hcps with autocomplete + tests"
```

---

## Task 6: Groq LLM client + model router

**Files:**
- Create: `backend/app/agent/__init__.py`
- Create: `backend/app/agent/llm.py`
- Create: `backend/app/agent/prompts.py`

- [ ] **Step 1: Write `backend/app/agent/__init__.py`** (empty)

- [ ] **Step 2: Write `backend/app/agent/prompts.py`**

```python
SYSTEM_PROMPT = """You are an AI assistant inside an HCP (Healthcare Professional) CRM used by pharma sales reps.

Your job: help the rep log, edit, search, and reflect on interactions with HCPs.

You have 5 tools. Pick the right one based on user intent:
- log_interaction: when the user describes a new meeting/call/email with an HCP
- edit_interaction: when the user wants to update an existing interaction (id required)
- search_interactions: when the user asks about past interactions
- summarize_hcp_history: when the user asks for an overview of an HCP
- suggest_follow_ups: when the user asks what to do next

Rules:
- Always call a tool if the user's request maps to one. Don't just chat.
- If the user submits a structured form (system message starts with "FORM_SUBMIT:"), call log_interaction directly with the provided fields.
- After a tool returns, give a 1-2 sentence summary to the user.
- If a tool returns an error, explain it briefly and ask for clarification.
"""

SUMMARY_PROMPT = """Summarize this HCP interaction in 1-2 sentences focusing on key topics, sentiment, and outcomes:

{interaction_text}
"""

HISTORY_SUMMARY_PROMPT = """Summarize the recent interactions with {hcp_name}. Cover: dominant topics, sentiment trend, and open follow-ups.

Interactions:
{interactions_text}
"""

FOLLOW_UP_PROMPT = """Given this HCP context, suggest 3 concrete next-best-actions ranked by priority. For each, provide a one-line rationale.

Context:
{context_text}

Return JSON: [{{"action": "...", "rationale": "..."}}, ...]
"""
```

- [ ] **Step 3: Write `backend/app/agent/llm.py`**

```python
from langchain_groq import ChatGroq
from app.config import settings

LONG_CONTEXT_THRESHOLD = 6000  # rough char count, not tokens


def get_llm(messages_text: str = "", with_tools: list | None = None) -> ChatGroq:
    model = settings.groq_model
    if len(messages_text) > LONG_CONTEXT_THRESHOLD * 4:  # ~6k tokens
        model = settings.groq_fallback_model
    llm = ChatGroq(
        model=model,
        temperature=0.2,
        api_key=settings.groq_api_key,
    )
    if with_tools:
        llm = llm.bind_tools(with_tools)
    return llm


def quick_completion(prompt: str) -> str:
    """Single-shot LLM call for tool-internal summaries (no agent loop)."""
    llm = get_llm(prompt)
    return llm.invoke(prompt).content
```

- [ ] **Step 4: Smoke-test the LLM client**

```bash
cd backend
python -c "from app.agent.llm import quick_completion; print(quick_completion('Say hello in 5 words'))"
```
Expected: a short greeting from Groq. (Requires valid `GROQ_API_KEY`.)

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent
git commit -m "feat(agent): add Groq LLM client with token-aware fallback router"
```

---

## Task 7: Tool 1 — log_interaction

**Files:**
- Create: `backend/app/agent/tools.py`
- Create: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing test for log_interaction**

Append to `backend/tests/test_tools.py` (create file):

```python
import uuid
from unittest.mock import patch
from app.models import HCP, Interaction
from app.agent.tools import log_interaction


def test_log_interaction_creates_row(db, monkeypatch):
    hcp = HCP(name="Dr. Aisha Sharma", specialty="Cardiology")
    db.add(hcp)
    db.commit()

    monkeypatch.setattr("app.agent.tools.quick_completion", lambda p: "Test summary.")
    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)

    result = log_interaction.invoke({
        "hcp_name": "Aisha Sharma",
        "interaction_type": "Meeting",
        "occurred_at": "2026-05-11T10:00:00",
        "topics_discussed": "Drug X efficacy",
        "sentiment": "positive",
        "outcomes": "Will trial",
        "follow_up_actions": "Send brochure",
    })

    assert "interaction_id" in result
    assert db.query(Interaction).count() == 1
    row = db.query(Interaction).first()
    assert row.hcp_id == hcp.id
    assert row.ai_summary == "Test summary."
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
pytest tests/test_tools.py::test_log_interaction_creates_row -v
```
Expected: FAIL with `ModuleNotFoundError` or `ImportError`.

- [ ] **Step 3: Write `backend/app/agent/tools.py` with `log_interaction` and helpers**

```python
import uuid
from datetime import datetime
from typing import Annotated
from langchain_core.tools import tool
from sqlalchemy import select
from app.db import SessionLocal
from app.models import HCP, Interaction, Sentiment
from app.agent.llm import quick_completion
from app.agent.prompts import SUMMARY_PROMPT


def _db_session():
    return SessionLocal()


def _resolve_hcp(db, name: str) -> HCP | None:
    stmt = select(HCP).where(HCP.name.ilike(f"%{name}%")).limit(1)
    return db.execute(stmt).scalar_one_or_none()


@tool
def log_interaction(
    hcp_name: Annotated[str, "Name of the HCP (fuzzy match)"],
    interaction_type: Annotated[str, "e.g. Meeting, Call, Email"],
    occurred_at: Annotated[str, "ISO 8601 datetime"],
    topics_discussed: Annotated[str, "What was discussed"],
    sentiment: Annotated[str, "positive | neutral | negative"] = "neutral",
    outcomes: Annotated[str, "Outcomes of the interaction"] = "",
    follow_up_actions: Annotated[str, "Next steps"] = "",
    attendees: Annotated[str, "Who attended"] = "",
    materials_shared: Annotated[list[str], "Materials shared"] = None,
    samples_distributed: Annotated[list[dict], "Samples distributed"] = None,
) -> dict:
    """Log a new HCP interaction. Resolves the HCP by fuzzy name match and creates a row. Auto-generates an AI summary."""
    db = _db_session()
    try:
        hcp = _resolve_hcp(db, hcp_name)
        if hcp is None:
            return {"error": f"HCP '{hcp_name}' not found. Try a different name."}

        interaction_text = (
            f"HCP: {hcp.name}\nType: {interaction_type}\nWhen: {occurred_at}\n"
            f"Topics: {topics_discussed}\nSentiment: {sentiment}\n"
            f"Outcomes: {outcomes}\nFollow-up: {follow_up_actions}"
        )
        summary = quick_completion(SUMMARY_PROMPT.format(interaction_text=interaction_text))

        row = Interaction(
            hcp_id=hcp.id,
            interaction_type=interaction_type,
            occurred_at=datetime.fromisoformat(occurred_at),
            topics_discussed=topics_discussed,
            sentiment=Sentiment(sentiment) if sentiment in [s.value for s in Sentiment] else None,
            outcomes=outcomes,
            follow_up_actions=follow_up_actions,
            attendees=attendees,
            materials_shared=materials_shared or [],
            samples_distributed=samples_distributed or [],
            ai_summary=summary,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "interaction_id": str(row.id),
            "hcp_name": hcp.name,
            "summary": summary,
        }
    finally:
        db.close()
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd backend
pytest tests/test_tools.py::test_log_interaction_creates_row -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent/tools.py backend/tests/test_tools.py
git commit -m "feat(agent): add log_interaction tool with AI summary"
```

---

## Task 8: Tool 2 — edit_interaction

**Files:**
- Modify: `backend/app/agent/tools.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing test**

Append to `backend/tests/test_tools.py`:

```python
def test_edit_interaction_patches_row(db, monkeypatch):
    hcp = HCP(name="Dr. Test")
    db.add(hcp)
    db.commit()
    interaction = Interaction(
        hcp_id=hcp.id,
        interaction_type="Meeting",
        occurred_at=datetime(2026, 5, 1),
        topics_discussed="Old topic",
        sentiment=Sentiment.neutral,
    )
    db.add(interaction)
    db.commit()

    from app.agent.tools import edit_interaction
    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)

    result = edit_interaction.invoke({
        "interaction_id": str(interaction.id),
        "topics_discussed": "New topic",
        "sentiment": "positive",
    })

    assert result.get("status") == "ok"
    db.refresh(interaction)
    assert interaction.topics_discussed == "New topic"
    assert interaction.sentiment == Sentiment.positive


def test_edit_interaction_missing_id_returns_error(db, monkeypatch):
    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)
    from app.agent.tools import edit_interaction
    result = edit_interaction.invoke({"interaction_id": str(uuid.uuid4()), "topics_discussed": "x"})
    assert "error" in result
```

Add to test_tools.py imports at top:
```python
from datetime import datetime
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_tools.py::test_edit_interaction_patches_row -v
```
Expected: FAIL (`ImportError: cannot import name 'edit_interaction'`).

- [ ] **Step 3: Append `edit_interaction` to `backend/app/agent/tools.py`**

```python
@tool
def edit_interaction(
    interaction_id: Annotated[str, "UUID of the interaction to edit"],
    interaction_type: Annotated[str | None, "New interaction type"] = None,
    occurred_at: Annotated[str | None, "New ISO 8601 datetime"] = None,
    topics_discussed: Annotated[str | None, "New topics"] = None,
    sentiment: Annotated[str | None, "positive | neutral | negative"] = None,
    outcomes: Annotated[str | None, "New outcomes"] = None,
    follow_up_actions: Annotated[str | None, "New follow-up actions"] = None,
) -> dict:
    """Edit fields on an existing interaction. Provide only the fields you want to change."""
    db = _db_session()
    try:
        row = db.get(Interaction, uuid.UUID(interaction_id))
        if row is None:
            return {"error": f"Interaction {interaction_id} not found."}
        if interaction_type is not None:
            row.interaction_type = interaction_type
        if occurred_at is not None:
            row.occurred_at = datetime.fromisoformat(occurred_at)
        if topics_discussed is not None:
            row.topics_discussed = topics_discussed
        if sentiment is not None and sentiment in [s.value for s in Sentiment]:
            row.sentiment = Sentiment(sentiment)
        if outcomes is not None:
            row.outcomes = outcomes
        if follow_up_actions is not None:
            row.follow_up_actions = follow_up_actions
        db.commit()
        return {"status": "ok", "interaction_id": interaction_id}
    finally:
        db.close()
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pytest tests/test_tools.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent/tools.py backend/tests/test_tools.py
git commit -m "feat(agent): add edit_interaction tool"
```

---

## Task 9: Tool 3 — search_interactions

**Files:**
- Modify: `backend/app/agent/tools.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing test**

Append to `tests/test_tools.py`:

```python
def test_search_interactions_filters_by_hcp(db, monkeypatch):
    hcp1 = HCP(name="Dr. Searched")
    hcp2 = HCP(name="Dr. Other")
    db.add_all([hcp1, hcp2])
    db.commit()
    db.add_all([
        Interaction(hcp_id=hcp1.id, interaction_type="Meeting",
                    occurred_at=datetime(2026, 5, 1), topics_discussed="A"),
        Interaction(hcp_id=hcp2.id, interaction_type="Call",
                    occurred_at=datetime(2026, 5, 2), topics_discussed="B"),
    ])
    db.commit()

    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)
    from app.agent.tools import search_interactions
    result = search_interactions.invoke({"hcp_name": "Searched"})

    assert "results" in result
    assert len(result["results"]) == 1
    assert result["results"][0]["interaction_type"] == "Meeting"
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_tools.py::test_search_interactions_filters_by_hcp -v
```
Expected: FAIL.

- [ ] **Step 3: Append to `backend/app/agent/tools.py`**

```python
@tool
def search_interactions(
    hcp_name: Annotated[str | None, "Filter by HCP name (fuzzy)"] = None,
    from_date: Annotated[str | None, "ISO date, inclusive"] = None,
    to_date: Annotated[str | None, "ISO date, inclusive"] = None,
    topic_keyword: Annotated[str | None, "Keyword in topics_discussed"] = None,
    limit: Annotated[int, "Max rows"] = 10,
) -> dict:
    """Search past interactions by HCP, date range, or topic keyword."""
    db = _db_session()
    try:
        stmt = select(Interaction).join(HCP, Interaction.hcp_id == HCP.id)
        if hcp_name:
            stmt = stmt.where(HCP.name.ilike(f"%{hcp_name}%"))
        if from_date:
            stmt = stmt.where(Interaction.occurred_at >= datetime.fromisoformat(from_date))
        if to_date:
            stmt = stmt.where(Interaction.occurred_at <= datetime.fromisoformat(to_date))
        if topic_keyword:
            stmt = stmt.where(Interaction.topics_discussed.ilike(f"%{topic_keyword}%"))
        stmt = stmt.order_by(Interaction.occurred_at.desc()).limit(limit)
        rows = db.execute(stmt).scalars().all()
        return {
            "results": [
                {
                    "id": str(r.id),
                    "hcp_id": str(r.hcp_id),
                    "interaction_type": r.interaction_type,
                    "occurred_at": r.occurred_at.isoformat(),
                    "topics_discussed": r.topics_discussed,
                    "sentiment": r.sentiment.value if r.sentiment else None,
                }
                for r in rows
            ]
        }
    finally:
        db.close()
```

- [ ] **Step 4: Run test, verify pass**

```bash
pytest tests/test_tools.py::test_search_interactions_filters_by_hcp -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent/tools.py backend/tests/test_tools.py
git commit -m "feat(agent): add search_interactions tool"
```

---

## Task 10: Tool 4 — summarize_hcp_history

**Files:**
- Modify: `backend/app/agent/tools.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing test**

Append:

```python
def test_summarize_hcp_history(db, monkeypatch):
    hcp = HCP(name="Dr. Summary")
    db.add(hcp)
    db.commit()
    db.add_all([
        Interaction(hcp_id=hcp.id, interaction_type="Meeting",
                    occurred_at=datetime(2026, 5, 1), topics_discussed="Drug X",
                    sentiment=Sentiment.positive),
        Interaction(hcp_id=hcp.id, interaction_type="Call",
                    occurred_at=datetime(2026, 5, 2), topics_discussed="Drug Y",
                    sentiment=Sentiment.neutral),
    ])
    db.commit()

    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)
    monkeypatch.setattr("app.agent.tools.quick_completion", lambda p: "Test history summary.")

    from app.agent.tools import summarize_hcp_history
    result = summarize_hcp_history.invoke({"hcp_name": "Summary"})

    assert "summary" in result
    assert result["summary"] == "Test history summary."
    assert result["interactions_used"] == 2
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_tools.py::test_summarize_hcp_history -v
```
Expected: FAIL.

- [ ] **Step 3: Append to `backend/app/agent/tools.py`**

Add import at top of file if missing:
```python
from app.agent.prompts import SUMMARY_PROMPT, HISTORY_SUMMARY_PROMPT, FOLLOW_UP_PROMPT
```

Append tool:

```python
@tool
def summarize_hcp_history(
    hcp_name: Annotated[str, "HCP name (fuzzy)"],
    max_interactions: Annotated[int, "Max recent interactions to consider"] = 20,
) -> dict:
    """Summarize recent interactions with an HCP: dominant topics, sentiment trend, open follow-ups."""
    db = _db_session()
    try:
        hcp = _resolve_hcp(db, hcp_name)
        if hcp is None:
            return {"error": f"HCP '{hcp_name}' not found."}
        rows = db.execute(
            select(Interaction)
            .where(Interaction.hcp_id == hcp.id)
            .order_by(Interaction.occurred_at.desc())
            .limit(max_interactions)
        ).scalars().all()
        if not rows:
            return {"summary": f"No interactions logged yet with {hcp.name}.", "interactions_used": 0}
        interactions_text = "\n\n".join(
            f"[{r.occurred_at.date()}] {r.interaction_type} | {r.sentiment.value if r.sentiment else '?'} | "
            f"{r.topics_discussed or ''} | follow-up: {r.follow_up_actions or '-'}"
            for r in rows
        )
        summary = quick_completion(
            HISTORY_SUMMARY_PROMPT.format(hcp_name=hcp.name, interactions_text=interactions_text)
        )
        return {"summary": summary, "interactions_used": len(rows)}
    finally:
        db.close()
```

- [ ] **Step 4: Run test, verify pass**

```bash
pytest tests/test_tools.py::test_summarize_hcp_history -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent/tools.py backend/tests/test_tools.py
git commit -m "feat(agent): add summarize_hcp_history tool"
```

---

## Task 11: Tool 5 — suggest_follow_ups

**Files:**
- Modify: `backend/app/agent/tools.py`
- Modify: `backend/tests/test_tools.py`

- [ ] **Step 1: Write failing test**

Append:

```python
def test_suggest_follow_ups(db, monkeypatch):
    hcp = HCP(name="Dr. Followup")
    db.add(hcp)
    db.commit()
    db.add(Interaction(
        hcp_id=hcp.id, interaction_type="Meeting",
        occurred_at=datetime(2026, 5, 1), topics_discussed="Drug X",
        sentiment=Sentiment.positive, outcomes="Wants more info",
    ))
    db.commit()

    monkeypatch.setattr("app.agent.tools._db_session", lambda: db)
    monkeypatch.setattr(
        "app.agent.tools.quick_completion",
        lambda p: '[{"action": "Send brochure", "rationale": "Asked for info"}]',
    )

    from app.agent.tools import suggest_follow_ups
    result = suggest_follow_ups.invoke({"hcp_name": "Followup"})

    assert "suggestions" in result
    assert isinstance(result["suggestions"], list)
    assert result["suggestions"][0]["action"] == "Send brochure"
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_tools.py::test_suggest_follow_ups -v
```
Expected: FAIL.

- [ ] **Step 3: Append to `backend/app/agent/tools.py`**

Add at top of file if missing:
```python
import json
```

Append tool:

```python
@tool
def suggest_follow_ups(
    hcp_name: Annotated[str | None, "HCP name (fuzzy)"] = None,
    interaction_id: Annotated[str | None, "Specific interaction id"] = None,
) -> dict:
    """Suggest 3 ranked next-best-actions for an HCP or interaction."""
    db = _db_session()
    try:
        context_parts = []
        if interaction_id:
            row = db.get(Interaction, uuid.UUID(interaction_id))
            if row is None:
                return {"error": f"Interaction {interaction_id} not found."}
            hcp = db.get(HCP, row.hcp_id)
            context_parts.append(
                f"HCP: {hcp.name}\nLast interaction: {row.occurred_at.date()} | "
                f"{row.interaction_type} | topics: {row.topics_discussed} | "
                f"sentiment: {row.sentiment.value if row.sentiment else '?'} | "
                f"outcomes: {row.outcomes}"
            )
        elif hcp_name:
            hcp = _resolve_hcp(db, hcp_name)
            if hcp is None:
                return {"error": f"HCP '{hcp_name}' not found."}
            rows = db.execute(
                select(Interaction).where(Interaction.hcp_id == hcp.id)
                .order_by(Interaction.occurred_at.desc()).limit(5)
            ).scalars().all()
            context_parts.append(f"HCP: {hcp.name}")
            for r in rows:
                context_parts.append(
                    f"- {r.occurred_at.date()} | {r.interaction_type} | "
                    f"{r.topics_discussed} | sentiment: {r.sentiment.value if r.sentiment else '?'}"
                )
        else:
            return {"error": "Provide either hcp_name or interaction_id."}

        raw = quick_completion(FOLLOW_UP_PROMPT.format(context_text="\n".join(context_parts)))
        try:
            suggestions = json.loads(raw)
        except json.JSONDecodeError:
            suggestions = [{"action": raw.strip(), "rationale": ""}]
        return {"suggestions": suggestions}
    finally:
        db.close()
```

- [ ] **Step 4: Run all tool tests, verify pass**

```bash
pytest tests/test_tools.py -v
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/agent/tools.py backend/tests/test_tools.py
git commit -m "feat(agent): add suggest_follow_ups tool"
```

---

## Task 12: LangGraph StateGraph build

**Files:**
- Create: `backend/app/agent/graph.py`

- [ ] **Step 1: Write `backend/app/agent/graph.py`**

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, SystemMessage
from app.agent.llm import get_llm
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import (
    log_interaction,
    edit_interaction,
    search_interactions,
    summarize_hcp_history,
    suggest_follow_ups,
)


TOOLS = [
    log_interaction,
    edit_interaction,
    search_interactions,
    summarize_hcp_history,
    suggest_follow_ups,
]


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str


def _agent_node(state: AgentState) -> dict:
    messages_text = "\n".join(getattr(m, "content", "") or "" for m in state["messages"])
    llm = get_llm(messages_text=messages_text, with_tools=TOOLS)
    msgs = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.invoke(msgs)
    return {"messages": [response]}


def _route_tools(state: AgentState) -> str:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tools"
    return END


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("agent", _agent_node)
    g.add_node("tools", ToolNode(TOOLS))
    g.add_edge(START, "agent")
    g.add_conditional_edges("agent", _route_tools, {"tools": "tools", END: END})
    g.add_edge("tools", "agent")
    return g.compile()


graph = build_graph()
```

- [ ] **Step 2: Smoke-test the graph compiles**

```bash
cd backend
python -c "from app.agent.graph import graph; print(graph)"
```
Expected: no exception; prints a compiled graph object.

- [ ] **Step 3: Commit**

```bash
git add backend/app/agent/graph.py
git commit -m "feat(agent): build LangGraph StateGraph with 5 tools"
```

---

## Task 13: POST /agent/invoke endpoint

**Files:**
- Create: `backend/app/routers/agent.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_agent_e2e.py`

- [ ] **Step 1: Write `backend/app/routers/agent.py`**

```python
import json
from fastapi import APIRouter
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from app.agent.graph import graph
from app.schemas import AgentInvokeRequest, AgentInvokeResponse, ToolCall

router = APIRouter(prefix="/agent", tags=["agent"])


def _build_user_message(req: AgentInvokeRequest) -> str:
    if req.mode == "form" and req.form_data:
        return (
            "FORM_SUBMIT: The user submitted a structured form. "
            "Call log_interaction directly with these fields and do not ask follow-up questions.\n"
            f"Fields: {json.dumps(req.form_data)}"
        )
    return req.message


@router.post("/invoke", response_model=AgentInvokeResponse)
def invoke(req: AgentInvokeRequest) -> AgentInvokeResponse:
    user_text = _build_user_message(req)
    state = {"messages": [HumanMessage(content=user_text)], "session_id": req.session_id}
    result = graph.invoke(state)

    tool_calls: list[ToolCall] = []
    final_text = ""
    pending: dict[str, dict] = {}

    for msg in result["messages"]:
        if isinstance(msg, AIMessage):
            for tc in (msg.tool_calls or []):
                pending[tc["id"]] = {"name": tc["name"], "args": tc["args"]}
            if msg.content:
                final_text = msg.content
        elif isinstance(msg, ToolMessage):
            base = pending.pop(msg.tool_call_id, {"name": msg.name, "args": {}})
            tool_calls.append(ToolCall(
                name=base["name"],
                args=base["args"],
                result=_safe_parse(msg.content),
            ))

    for tc_id, info in pending.items():
        tool_calls.append(ToolCall(name=info["name"], args=info["args"], result=None))

    return AgentInvokeResponse(final_text=final_text, tool_calls=tool_calls)


def _safe_parse(content: str):
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        return content
```

- [ ] **Step 2: Register router in `backend/app/main.py`**

Add to imports:
```python
from app.routers import hcps, agent
```
Add after the existing `include_router`:
```python
app.include_router(agent.router)
```

- [ ] **Step 3: Write end-to-end test with mocked LLM**

Create `backend/tests/test_agent_e2e.py`:

```python
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage, ToolMessage
from app.models import HCP


def test_agent_invoke_form_mode_calls_log_interaction(client, db, monkeypatch):
    hcp = HCP(name="Dr. E2E Test")
    db.add(hcp)
    db.commit()

    monkeypatch.setattr("app.agent.tools.quick_completion", lambda p: "Mocked summary.")

    fake_tool_call = {
        "id": "call_1",
        "name": "log_interaction",
        "args": {
            "hcp_name": "E2E Test",
            "interaction_type": "Meeting",
            "occurred_at": "2026-05-11T10:00:00",
            "topics_discussed": "Test",
            "sentiment": "positive",
        },
    }

    ai_call_msg = AIMessage(content="", tool_calls=[fake_tool_call])
    ai_final_msg = AIMessage(content="Logged the interaction.")

    invoke_calls = {"n": 0}

    def fake_invoke(self, messages, *args, **kwargs):
        invoke_calls["n"] += 1
        return ai_call_msg if invoke_calls["n"] == 1 else ai_final_msg

    with patch("langchain_groq.ChatGroq.invoke", new=fake_invoke), \
         patch("langchain_groq.ChatGroq.bind_tools", lambda self, t: self):
        r = client.post("/agent/invoke", json={
            "session_id": "s1",
            "message": "",
            "mode": "form",
            "form_data": {
                "hcp_name": "E2E Test",
                "interaction_type": "Meeting",
                "occurred_at": "2026-05-11T10:00:00",
                "topics_discussed": "Test",
                "sentiment": "positive",
            },
        })

    assert r.status_code == 200
    body = r.json()
    assert body["final_text"] == "Logged the interaction."
    assert any(tc["name"] == "log_interaction" for tc in body["tool_calls"])
```

- [ ] **Step 4: Run test**

```bash
cd backend
pytest tests/test_agent_e2e.py -v
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/agent.py backend/app/main.py backend/tests/test_agent_e2e.py
git commit -m "feat(api): add POST /agent/invoke with dual chat/form mode"
```

---

## Task 14: GET /interactions endpoints

**Files:**
- Create: `backend/app/routers/interactions.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_interactions.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/test_interactions.py`:

```python
from datetime import datetime
from app.models import HCP, Interaction, Sentiment


def test_list_interactions(client, db):
    hcp = HCP(name="Dr. List")
    db.add(hcp)
    db.commit()
    db.add(Interaction(
        hcp_id=hcp.id, interaction_type="Meeting",
        occurred_at=datetime(2026, 5, 1), topics_discussed="Topic",
        sentiment=Sentiment.positive,
    ))
    db.commit()

    r = client.get(f"/interactions?hcp_id={hcp.id}")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["topics_discussed"] == "Topic"


def test_get_interaction_by_id(client, db):
    hcp = HCP(name="Dr. Single")
    db.add(hcp)
    db.commit()
    row = Interaction(
        hcp_id=hcp.id, interaction_type="Call",
        occurred_at=datetime(2026, 5, 1), topics_discussed="X",
    )
    db.add(row)
    db.commit()
    r = client.get(f"/interactions/{row.id}")
    assert r.status_code == 200
    assert r.json()["topics_discussed"] == "X"


def test_get_interaction_404(client):
    import uuid
    r = client.get(f"/interactions/{uuid.uuid4()}")
    assert r.status_code == 404
```

- [ ] **Step 2: Write `backend/app/routers/interactions.py`**

```python
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import get_db
from app.models import Interaction
from app.schemas import InteractionOut

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.get("", response_model=list[InteractionOut])
def list_interactions(
    hcp_id: str | None = None,
    from_: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    stmt = select(Interaction)
    if hcp_id:
        stmt = stmt.where(Interaction.hcp_id == uuid.UUID(hcp_id))
    if from_:
        stmt = stmt.where(Interaction.occurred_at >= datetime.fromisoformat(from_))
    stmt = stmt.order_by(Interaction.occurred_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars())


@router.get("/{interaction_id}", response_model=InteractionOut)
def get_interaction(interaction_id: str, db: Session = Depends(get_db)):
    row = db.get(Interaction, uuid.UUID(interaction_id))
    if row is None:
        raise HTTPException(404, "Interaction not found")
    return row
```

- [ ] **Step 3: Register router in `backend/app/main.py`**

Update import:
```python
from app.routers import hcps, agent, interactions
```
Add:
```python
app.include_router(interactions.router)
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_interactions.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Run full backend test suite**

```bash
pytest -v
```
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/interactions.py backend/app/main.py backend/tests/test_interactions.py
git commit -m "feat(api): add GET /interactions list and detail"
```

---

## Task 15: Frontend scaffold (Vite + React + Redux + Tailwind + Inter)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/store.ts`

- [ ] **Step 1: Init Vite project structure**

```bash
cd "C:/Users/shankar mishra/OneDrive/Desktop/AIVOA.AI"
mkdir -p frontend/src
```

- [ ] **Step 2: Write `frontend/package.json`**

```json
{
  "name": "aivoa-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-redux": "^9.1.2",
    "@reduxjs/toolkit": "^2.3.0",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "tailwindcss": "^3.4.14",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  }
}
```

- [ ] **Step 3: Write `frontend/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/agent": "http://localhost:8000",
      "/hcps": "http://localhost:8000",
      "/interactions": "http://localhost:8000",
      "/healthz": "http://localhost:8000",
    },
  },
});
```

- [ ] **Step 4: Write `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Write `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Write `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <title>AIVOA — HCP CRM</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `frontend/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Write `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 9: Write `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
  font-family: "Inter", system-ui, sans-serif;
}
```

- [ ] **Step 10: Write `frontend/src/store.ts`**

```ts
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./api/apiSlice";
import interactionDraftReducer from "./features/interactionDraft/slice";
import chatReducer from "./features/chat/slice";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    interactionDraft: interactionDraftReducer,
    chat: chatReducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 11: Write `frontend/src/App.tsx`** (placeholder until pages exist)

```tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b bg-white px-6 py-3 flex items-center gap-6">
          <h1 className="text-xl font-semibold">AIVOA</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              Log Interaction
            </Link>
            <Link to="/interactions" className="text-slate-600 hover:text-slate-900">
              History
            </Link>
          </nav>
        </header>
        <main className="p-6">
          <Routes>
            <Route path="/" element={<div>Log Interaction Page (TBD task 18)</div>} />
            <Route path="/interactions" element={<div>History Page (TBD task 21)</div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 12: Write `frontend/src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

- [ ] **Step 13: Install and run**

```bash
cd frontend
npm install
npm run dev
```
Expected: Vite shows `Local: http://localhost:5173/`. Open in browser → see "AIVOA" header with nav. (Slices and api/ will fail until next task — for now, comment out the imports in `store.ts` if needed, or proceed to next task immediately.)

- [ ] **Step 14: Commit (after Task 16 wires the slices, this builds clean)**

Skip commit until Task 16. Or commit now with placeholder reducers — your choice. To commit now:

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Vite + React + Redux + Tailwind + Inter"
```

---

## Task 16: API slices (RTK Query) + Redux slices

**Files:**
- Create: `frontend/src/api/apiSlice.ts`
- Create: `frontend/src/api/hcps.ts`
- Create: `frontend/src/api/interactions.ts`
- Create: `frontend/src/api/agent.ts`
- Create: `frontend/src/features/interactionDraft/slice.ts`
- Create: `frontend/src/features/chat/slice.ts`

- [ ] **Step 1: Write `frontend/src/api/apiSlice.ts`**

```ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/" }),
  tagTypes: ["HCP", "Interaction"],
  endpoints: () => ({}),
});
```

- [ ] **Step 2: Write `frontend/src/api/hcps.ts`**

```ts
import { apiSlice } from "./apiSlice";

export interface HCP {
  id: string;
  name: string;
  specialty?: string | null;
  institution?: string | null;
}

const hcpsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listHcps: b.query<HCP[], { q?: string } | void>({
      query: (arg) => `hcps${arg?.q ? `?q=${encodeURIComponent(arg.q)}` : ""}`,
      providesTags: ["HCP"],
    }),
  }),
});

export const { useListHcpsQuery } = hcpsApi;
```

- [ ] **Step 3: Write `frontend/src/api/interactions.ts`**

```ts
import { apiSlice } from "./apiSlice";

export interface Interaction {
  id: string;
  hcp_id: string;
  interaction_type: string;
  occurred_at: string;
  attendees?: string | null;
  topics_discussed?: string | null;
  materials_shared?: string[] | null;
  samples_distributed?: { name: string; qty: number }[] | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
  outcomes?: string | null;
  follow_up_actions?: string | null;
  ai_summary?: string | null;
  ai_suggestions?: { action: string; rationale: string }[] | null;
  created_at: string;
  updated_at: string;
}

const interactionsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listInteractions: b.query<Interaction[], { hcp_id?: string } | void>({
      query: (arg) => `interactions${arg?.hcp_id ? `?hcp_id=${arg.hcp_id}` : ""}`,
      providesTags: ["Interaction"],
    }),
    getInteraction: b.query<Interaction, string>({
      query: (id) => `interactions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Interaction", id }],
    }),
  }),
});

export const { useListInteractionsQuery, useGetInteractionQuery } = interactionsApi;
```

- [ ] **Step 4: Write `frontend/src/api/agent.ts`**

```ts
import { apiSlice } from "./apiSlice";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentInvokeResponse {
  final_text: string;
  tool_calls: ToolCall[];
}

export interface AgentInvokeRequest {
  session_id: string;
  message: string;
  mode: "chat" | "form";
  form_data?: Record<string, unknown>;
}

const agentApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    invokeAgent: b.mutation<AgentInvokeResponse, AgentInvokeRequest>({
      query: (body) => ({ url: "agent/invoke", method: "POST", body }),
      invalidatesTags: ["Interaction"],
    }),
  }),
});

export const { useInvokeAgentMutation } = agentApi;
```

- [ ] **Step 5: Write `frontend/src/features/interactionDraft/slice.ts`**

```ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface InteractionDraft {
  hcp_name: string;
  interaction_type: string;
  occurred_at: string;
  attendees: string;
  topics_discussed: string;
  materials_shared: string[];
  samples_distributed: { name: string; qty: number }[];
  sentiment: "positive" | "neutral" | "negative";
  outcomes: string;
  follow_up_actions: string;
}

const initialState: InteractionDraft = {
  hcp_name: "",
  interaction_type: "Meeting",
  occurred_at: new Date().toISOString().slice(0, 16),
  attendees: "",
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "neutral",
  outcomes: "",
  follow_up_actions: "",
};

const slice = createSlice({
  name: "interactionDraft",
  initialState,
  reducers: {
    setField<K extends keyof InteractionDraft>(
      state: InteractionDraft,
      action: PayloadAction<{ key: K; value: InteractionDraft[K] }>,
    ) {
      (state as any)[action.payload.key] = action.payload.value;
    },
    resetDraft: () => initialState,
  },
});

export const { setField, resetDraft } = slice.actions;
export default slice.reducer;
```

- [ ] **Step 6: Write `frontend/src/features/chat/slice.ts`**

```ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ToolCall } from "../../api/agent";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
}

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
}

const initialState: ChatState = {
  sessionId: crypto.randomUUID(),
  messages: [],
  isStreaming: false,
};

const slice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    appendMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    resetSession(state) {
      state.messages = [];
      state.sessionId = crypto.randomUUID();
    },
  },
});

export const { appendMessage, setStreaming, resetSession } = slice.actions;
export default slice.reducer;
```

- [ ] **Step 7: Verify build**

```bash
cd frontend
npm run build
```
Expected: build succeeds with no TS errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add RTK Query api slices and Redux slices"
```

---

## Task 17: Top bar component + Inter font verification

**Files:**
- Create: `frontend/src/components/TopBar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write `frontend/src/components/TopBar.tsx`**

```tsx
import { Link, useLocation } from "react-router-dom";

export default function TopBar() {
  const { pathname } = useLocation();
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-8 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold">
          A
        </div>
        <h1 className="text-lg font-semibold text-slate-900">AIVOA · HCP CRM</h1>
      </div>
      <nav className="flex gap-1 text-sm">
        <NavLink to="/" active={pathname === "/"}>
          Log Interaction
        </NavLink>
        <NavLink to="/interactions" active={pathname === "/interactions"}>
          History
        </NavLink>
      </nav>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 2: Update `frontend/src/App.tsx`** to use TopBar and prep page slots

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import LogInteractionPage from "./pages/LogInteractionPage";
import InteractionsTablePage from "./pages/InteractionsTablePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<LogInteractionPage />} />
            <Route path="/interactions" element={<InteractionsTablePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Create placeholder pages so build passes**

Create `frontend/src/pages/LogInteractionPage.tsx`:
```tsx
export default function LogInteractionPage() {
  return <div className="p-6">Log Interaction (under construction)</div>;
}
```

Create `frontend/src/pages/InteractionsTablePage.tsx`:
```tsx
export default function InteractionsTablePage() {
  return <div className="p-6">History (under construction)</div>;
}
```

- [ ] **Step 4: Run dev server and verify Inter font**

```bash
cd frontend
npm run dev
```
Open `http://localhost:5173`. DevTools → Elements → confirm body has `font-family: "Inter", system-ui, sans-serif;` and the network panel shows the Inter font requests succeeding.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add TopBar and route shells"
```

---

## Task 18: InteractionForm component

**Files:**
- Create: `frontend/src/components/InteractionForm.tsx`
- Modify: `frontend/src/pages/LogInteractionPage.tsx`

- [ ] **Step 1: Write `frontend/src/components/InteractionForm.tsx`**

```tsx
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setField, resetDraft } from "../features/interactionDraft/slice";
import { useListHcpsQuery } from "../api/hcps";
import { useInvokeAgentMutation } from "../api/agent";
import { appendMessage } from "../features/chat/slice";

const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference"];
const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export default function InteractionForm() {
  const draft = useSelector((s: RootState) => s.interactionDraft);
  const sessionId = useSelector((s: RootState) => s.chat.sessionId);
  const dispatch = useDispatch();

  const [hcpQuery, setHcpQuery] = useState("");
  const { data: hcpOptions = [] } = useListHcpsQuery({ q: hcpQuery });
  const [invokeAgent, { isLoading }] = useInvokeAgentMutation();

  const onChange = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    dispatch(setField({ key, value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await invokeAgent({
        session_id: sessionId,
        message: "",
        mode: "form",
        form_data: { ...draft, occurred_at: new Date(draft.occurred_at).toISOString() },
      }).unwrap();
      dispatch(appendMessage({
        role: "assistant",
        content: res.final_text,
        tool_calls: res.tool_calls,
      }));
      dispatch(resetDraft());
    } catch (err) {
      console.error(err);
      alert("Failed to log interaction. See console.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-slate-900">Log HCP Interaction</h2>

      <Field label="HCP Name">
        <input
          list="hcp-options"
          value={draft.hcp_name}
          onChange={(e) => {
            setHcpQuery(e.target.value);
            onChange("hcp_name", e.target.value);
          }}
          className="input"
          placeholder="Start typing..."
          required
        />
        <datalist id="hcp-options">
          {hcpOptions.map((h) => (
            <option key={h.id} value={h.name} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Interaction Type">
          <select
            value={draft.interaction_type}
            onChange={(e) => onChange("interaction_type", e.target.value)}
            className="input"
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Date & Time">
          <input
            type="datetime-local"
            value={draft.occurred_at}
            onChange={(e) => onChange("occurred_at", e.target.value)}
            className="input"
            required
          />
        </Field>
      </div>

      <Field label="Attendees">
        <input
          value={draft.attendees}
          onChange={(e) => onChange("attendees", e.target.value)}
          className="input"
          placeholder="Comma-separated"
        />
      </Field>

      <Field label="Topics Discussed">
        <textarea
          value={draft.topics_discussed}
          onChange={(e) => onChange("topics_discussed", e.target.value)}
          className="input min-h-[80px]"
          required
        />
      </Field>

      <Field label="HCP Sentiment">
        <div className="flex gap-4">
          {SENTIMENTS.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm capitalize">
              <input
                type="radio"
                name="sentiment"
                checked={draft.sentiment === s}
                onChange={() => onChange("sentiment", s)}
              />
              {s}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Outcomes">
        <textarea
          value={draft.outcomes}
          onChange={(e) => onChange("outcomes", e.target.value)}
          className="input min-h-[60px]"
        />
      </Field>

      <Field label="Follow-up Actions">
        <textarea
          value={draft.follow_up_actions}
          onChange={(e) => onChange("follow_up_actions", e.target.value)}
          className="input min-h-[60px]"
        />
      </Field>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        {isLoading ? "Logging..." : "Log Interaction"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 block mb-1">{label}</span>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: Add shared input class to `frontend/src/index.css`**

Append:

```css
@layer components {
  .input {
    @apply w-full rounded-md border border-slate-300 px-3 py-2 text-sm
           focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
           bg-white;
  }
}
```

- [ ] **Step 3: Update `frontend/src/pages/LogInteractionPage.tsx`**

```tsx
import InteractionForm from "../components/InteractionForm";

export default function LogInteractionPage() {
  return (
    <div className="h-full grid grid-cols-[1.4fr_1fr]">
      <div className="bg-white border-r border-slate-200">
        <InteractionForm />
      </div>
      <div className="bg-slate-50 flex items-center justify-center text-slate-400">
        AI Assistant (next task)
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual test**

Start backend (`uvicorn app.main:app --reload --port 8000`) and frontend (`npm run dev`). Open `http://localhost:5173`, fill the form (pick an HCP from autocomplete), click "Log Interaction". Expected: button shows "Logging...", form clears on success, network shows POST `/agent/invoke` returning 200.

Verify a row was inserted:
```bash
docker compose exec postgres psql -U aivoa -d aivoa -c "SELECT id, interaction_type, ai_summary FROM interactions;"
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add InteractionForm with HCP autocomplete and submit"
```

---

## Task 19: AIAssistantPanel + ToolCallBubble (chat UI)

**Files:**
- Create: `frontend/src/components/ToolCallBubble.tsx`
- Create: `frontend/src/components/AIAssistantPanel.tsx`
- Modify: `frontend/src/pages/LogInteractionPage.tsx`

- [ ] **Step 1: Write `frontend/src/components/ToolCallBubble.tsx`**

```tsx
import { useState } from "react";
import { ToolCall } from "../api/agent";

export default function ToolCallBubble({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs font-mono">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-amber-900 hover:underline"
      >
        <span>🔧</span>
        <span className="font-semibold">{tc.name}</span>
        <span className="text-amber-700">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          <div>
            <span className="text-amber-800">args:</span>
            <pre className="bg-white rounded p-1 overflow-x-auto">
              {JSON.stringify(tc.args, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-amber-800">result:</span>
            <pre className="bg-white rounded p-1 overflow-x-auto">
              {typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/AIAssistantPanel.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { appendMessage, setStreaming } from "../features/chat/slice";
import { useInvokeAgentMutation } from "../api/agent";
import ToolCallBubble from "./ToolCallBubble";

export default function AIAssistantPanel() {
  const dispatch = useDispatch();
  const { sessionId, messages, isStreaming } = useSelector((s: RootState) => s.chat);
  const [input, setInput] = useState("");
  const [invokeAgent] = useInvokeAgentMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    dispatch(appendMessage({ role: "user", content: text }));
    setInput("");
    dispatch(setStreaming(true));
    try {
      const res = await invokeAgent({
        session_id: sessionId,
        message: text,
        mode: "chat",
      }).unwrap();
      dispatch(appendMessage({
        role: "assistant",
        content: res.final_text,
        tool_calls: res.tool_calls,
      }));
    } catch (err) {
      dispatch(appendMessage({
        role: "assistant",
        content: "Sorry, the AI is unavailable. Please use the form.",
      }));
    } finally {
      dispatch(setStreaming(false));
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <h3 className="font-semibold text-slate-900">AI Assistant</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            Log interaction details here (e.g., "Met Dr. Aisha Sharma today, discussed Drug X efficacy, positive sentiment, shared brochure") or ask "Show me past interactions with Dr. Sharma."
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            {m.content && (
              <div
                className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.content}
              </div>
            )}
            {m.tool_calls && m.tool_calls.length > 0 && (
              <div className="mt-2 space-y-1 text-left">
                {m.tool_calls.map((tc, j) => (
                  <ToolCallBubble key={j} tc={tc} />
                ))}
              </div>
            )}
          </div>
        ))}
        {isStreaming && <div className="text-xs text-slate-400">AI is thinking...</div>}
      </div>

      <div className="border-t border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask AI for help..."
          className="input min-h-[60px] resize-none"
          disabled={isStreaming}
        />
        <button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          className="mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `frontend/src/pages/LogInteractionPage.tsx`**

```tsx
import InteractionForm from "../components/InteractionForm";
import AIAssistantPanel from "../components/AIAssistantPanel";

export default function LogInteractionPage() {
  return (
    <div className="h-full grid grid-cols-[1.4fr_1fr]">
      <div className="bg-white overflow-y-auto">
        <InteractionForm />
      </div>
      <AIAssistantPanel />
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke test**

With backend + frontend running, in the chat:
1. Type: `Log a meeting with Dr. Aisha Sharma today at 2pm, discussed Drug X, positive sentiment.` → press Enter.
2. Watch the tool-call bubble appear with `log_interaction`.
3. Type: `Show me past interactions with Dr. Aisha Sharma.` → see `search_interactions` bubble.
4. Type: `Summarize my history with Dr. Aisha Sharma.` → see `summarize_hcp_history` bubble.
5. Type: `What should I do next with Dr. Aisha Sharma?` → see `suggest_follow_ups` bubble.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add AI Assistant panel with tool-call bubbles"
```

---

## Task 20: Interactions history page with edit modal

**Files:**
- Create: `frontend/src/components/InteractionsTable.tsx`
- Create: `frontend/src/components/EditInteractionModal.tsx`
- Modify: `frontend/src/pages/InteractionsTablePage.tsx`

- [ ] **Step 1: Write `frontend/src/components/InteractionsTable.tsx`**

```tsx
import { useState } from "react";
import { useListInteractionsQuery } from "../api/interactions";
import { useListHcpsQuery } from "../api/hcps";
import EditInteractionModal from "./EditInteractionModal";

export default function InteractionsTable() {
  const { data: interactions = [], isLoading } = useListInteractionsQuery();
  const { data: hcps = [] } = useListHcpsQuery();
  const [editingId, setEditingId] = useState<string | null>(null);

  const hcpById = Object.fromEntries(hcps.map((h) => [h.id, h.name]));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Interaction History</h2>
      {isLoading && <div>Loading...</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">HCP</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Topics</th>
              <th className="px-3 py-2">Sentiment</th>
              <th className="px-3 py-2">AI Summary</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((i) => (
              <tr key={i.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(i.occurred_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{hcpById[i.hcp_id] ?? "—"}</td>
                <td className="px-3 py-2">{i.interaction_type}</td>
                <td className="px-3 py-2 max-w-xs truncate">{i.topics_discussed}</td>
                <td className="px-3 py-2">
                  <SentimentChip s={i.sentiment} />
                </td>
                <td className="px-3 py-2 max-w-md truncate text-slate-600">
                  {i.ai_summary ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setEditingId(i.id)}
                    className="text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingId && (
        <EditInteractionModal id={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

function SentimentChip({ s }: { s: string | null | undefined }) {
  if (!s) return <span className="text-slate-400">—</span>;
  const colors = {
    positive: "bg-green-100 text-green-800",
    neutral: "bg-slate-100 text-slate-700",
    negative: "bg-red-100 text-red-800",
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[s as keyof typeof colors]}`}>
      {s}
    </span>
  );
}
```

- [ ] **Step 2: Write `frontend/src/components/EditInteractionModal.tsx`**

```tsx
import { useState, useEffect } from "react";
import { useGetInteractionQuery } from "../api/interactions";
import { useInvokeAgentMutation } from "../api/agent";
import { useSelector } from "react-redux";
import { RootState } from "../store";

export default function EditInteractionModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { data: original } = useGetInteractionQuery(id);
  const [topics, setTopics] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("neutral");
  const [outcomes, setOutcomes] = useState("");
  const sessionId = useSelector((s: RootState) => s.chat.sessionId);
  const [invoke, { isLoading }] = useInvokeAgentMutation();

  useEffect(() => {
    if (original) {
      setTopics(original.topics_discussed ?? "");
      setSentiment(original.sentiment ?? "neutral");
      setOutcomes(original.outcomes ?? "");
    }
  }, [original]);

  const save = async () => {
    await invoke({
      session_id: sessionId,
      message: `Edit interaction ${id}: topics_discussed='${topics}', sentiment='${sentiment}', outcomes='${outcomes}'.`,
      mode: "chat",
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Interaction</h3>
        <label className="block mb-3">
          <span className="text-sm font-medium block mb-1">Topics</span>
          <textarea value={topics} onChange={(e) => setTopics(e.target.value)} className="input min-h-[80px]" />
        </label>
        <label className="block mb-3">
          <span className="text-sm font-medium block mb-1">Sentiment</span>
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as any)}
            className="input"
          >
            <option value="positive">positive</option>
            <option value="neutral">neutral</option>
            <option value="negative">negative</option>
          </select>
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium block mb-1">Outcomes</span>
          <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="input min-h-[60px]" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isLoading}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-md"
          >
            {isLoading ? "Saving..." : "Save (via AI)"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `frontend/src/pages/InteractionsTablePage.tsx`**

```tsx
import InteractionsTable from "../components/InteractionsTable";

export default function InteractionsTablePage() {
  return <InteractionsTable />;
}
```

- [ ] **Step 4: Manual smoke test**

Navigate to `/interactions`. Verify table shows past interactions. Click Edit on a row → modal opens → change topic, save → modal closes, table refreshes (tag invalidation), and a `edit_interaction` tool call hits the backend.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add interactions history table with AI-powered edit modal"
```

---

## Task 21: README + demo script

**Files:**
- Create: `README.md` (at repo root)
- Create: `docs/demo-script.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# AIVOA — AI-First HCP CRM (Log Interaction Module)

Round 1 assignment build. A pharma sales rep can log Healthcare Professional (HCP) interactions through a structured form **or** by chatting with an LLM-powered assistant. Both paths flow through a single **LangGraph** agent that owns 5 tools.

## Stack

- **Frontend:** React 18, Vite, TypeScript, Redux Toolkit, RTK Query, Tailwind, Google Inter
- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic
- **Agent:** LangGraph + langchain-groq (`gemma2-9b-it` primary, `llama-3.3-70b-versatile` long-context fallback)
- **Database:** PostgreSQL 16 (Docker)

## Quick start

### 1. Prereqs
- Docker Desktop
- Python 3.11
- Node 18+
- A Groq API key from https://console.groq.com

### 2. Boot Postgres

```bash
docker compose up -d postgres
```

### 3. Backend

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate         # Windows
# or: source .venv/bin/activate  # macOS/Linux
pip install -e ".[dev]"
cp .env.example .env             # then put your GROQ_API_KEY into .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Testing

```bash
cd backend
docker compose exec postgres psql -U aivoa -c "CREATE DATABASE aivoa_test;"  # one-time
pytest -v
```

## The 5 LangGraph tools

| Tool | What it does |
|---|---|
| `log_interaction` | Resolves HCP by fuzzy name → inserts a row → auto-generates an AI summary |
| `edit_interaction` | Patches fields on an existing interaction (id required) |
| `search_interactions` | Filters past interactions by HCP, date range, or topic keyword |
| `summarize_hcp_history` | LLM summary of recent interactions with one HCP (themes, sentiment, open follow-ups) |
| `suggest_follow_ups` | LLM-generated 3 ranked next-best-actions for an HCP or interaction |

## Architecture in one paragraph

Both the form (left) and the chat (right) post to `POST /agent/invoke`. Form submissions are wrapped into a `FORM_SUBMIT:` synthetic message that nudges the agent to call `log_interaction` directly; chat sends freeform text. The agent runs a LangGraph `StateGraph` (agent → tool_node → agent loop) and returns the final assistant message plus the full list of tool calls so the UI can render them as visible bubbles.

## What's out of scope (deliberately)

- Voice-note transcription (field is shown but disabled; future scope)
- Authentication / multi-user (single demo user)
- Hosted deployment (localhost demo)

## Project layout

```
backend/           FastAPI + LangGraph + Alembic
frontend/          React + Redux + Tailwind
docker-compose.yml Postgres
docs/              Spec, plan, demo script
```
````

- [ ] **Step 2: Write `docs/demo-script.md`**

```markdown
# Video Demo Script (10–15 min)

## 0. Intro (1 min)
- "Hi, this is my submission for the AI-First CRM HCP Module — Log Interaction Screen."
- Show task summary from the assignment doc.

## 1. Frontend walkthrough (3 min)
- Open http://localhost:5173.
- Highlight the Inter font in DevTools (Computed → font-family).
- Walk through the form: HCP autocomplete, interaction type, datetime, topics, sentiment radios, outcomes, follow-ups.
- Walk through the AI Assistant panel on the right.
- Click History tab → table view.

## 2. Demo all 5 LangGraph tools (6 min)

For each, type the prompt into the chat and point out the tool-call bubble that fires:

1. **log_interaction**
   - Prompt: "Log a meeting with Dr. Aisha Sharma today at 2pm. We discussed Drug X efficacy. She was positive and wants more clinical data. Follow-up: send the latest study PDF."
2. **search_interactions**
   - Prompt: "Show me my recent interactions with Dr. Aisha Sharma."
3. **summarize_hcp_history**
   - Prompt: "Summarize my history with Dr. Aisha Sharma."
4. **suggest_follow_ups**
   - Prompt: "What should I do next with Dr. Aisha Sharma?"
5. **edit_interaction**
   - Open History → click Edit on the interaction we just logged → change sentiment to neutral → Save.
   - Show the resulting `edit_interaction` tool bubble.

For each, expand the bubble to show args + result.

## 3. Form path (1 min)
- Show that submitting the form also triggers `log_interaction` (same agent path, FORM_SUBMIT message).

## 4. Code walkthrough (3 min)

In this order:
1. `backend/app/agent/tools.py` — the 5 `@tool` functions.
2. `backend/app/agent/graph.py` — StateGraph wiring agent → ToolNode → agent.
3. `backend/app/agent/llm.py` — the Groq client + long-context fallback router.
4. `backend/app/routers/agent.py` — the single `/agent/invoke` endpoint and the FORM_SUBMIT trick.
5. `frontend/src/components/AIAssistantPanel.tsx` — chat panel and how it renders tool bubbles.

## 5. Wrap (1 min)
- Recap: dual UI, single agent, 5 tools, all required tech.
- Mention out-of-scope items (voice, auth, deploy).
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/demo-script.md
git commit -m "docs: add README and video demo script"
```

---

## Task 22: Manual QA pass + final polish

**Files:** none new — verification only.

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend
pytest -v
```
Expected: all green.

- [ ] **Step 2: Run frontend build**

```bash
cd frontend
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Cold-boot manual flow**

```bash
docker compose down
docker compose up -d postgres
# wait for healthcheck, then:
cd backend && . .venv/Scripts/activate && alembic upgrade head && python scripts/seed.py
uvicorn app.main:app --reload --port 8000 &
cd ../frontend && npm run dev
```

Walk through the 5 demo prompts from `docs/demo-script.md`. Confirm:
- Each prompt produces the expected tool-call bubble.
- Form submission also produces a tool-call bubble.
- History page refreshes after edits.

- [ ] **Step 4: Push to GitHub and submit**

```bash
# Create a new GitHub repo under your account (github.com/innoqorein-code or similar)
git remote add origin git@github.com:<your-user>/aivoa-hcp-crm.git
git branch -M main
git push -u origin main
```

Record the 10–15 min video following `docs/demo-script.md`, upload to Drive (link-share enabled), then submit both via the Google Form: https://forms.gle/mkgZPhtkFtnvLJCz7

- [ ] **Step 5: Final commit (if any docs were tweaked)**

```bash
git add -A
git status  # only commit if there are changes
git commit -m "chore: final QA pass" || true
git push
```

---

## Self-review

**Spec coverage:**
- ✅ Mandatory LangGraph + LLM — Tasks 6, 7–11, 12.
- ✅ React + Redux frontend — Tasks 15, 16, 17, 18, 19, 20.
- ✅ Python + FastAPI backend — Tasks 2, 5, 13, 14.
- ✅ Postgres — Tasks 1, 4.
- ✅ Google Inter — Task 15 (index.html + tailwind config) + Task 17 verification.
- ✅ Groq `gemma2-9b-it` + `llama-3.3-70b-versatile` fallback — Task 6.
- ✅ Dual UI (form + chat) — Tasks 18, 19.
- ✅ 5 tools (log_interaction, edit_interaction, search_interactions, summarize_hcp_history, suggest_follow_ups) — Tasks 7–11.
- ✅ GitHub repo + README + video — Tasks 21, 22.

**Placeholder scan:** No "TBD" / "TODO" steps. Every step has executable content.

**Type consistency:**
- `log_interaction` returns `{interaction_id, hcp_name, summary}` — referenced consistently in e2e test (Task 13).
- `edit_interaction` returns `{status, interaction_id}` — consistent in test (Task 8).
- `search_interactions` returns `{results: [...]}` — consistent (Task 9).
- `summarize_hcp_history` returns `{summary, interactions_used}` — consistent (Task 10).
- `suggest_follow_ups` returns `{suggestions: [...]}` — consistent (Task 11).
- Tool names match between `tools.py`, `graph.py` TOOLS list, README, and demo script.
- Pydantic schemas (`HCPOut`, `InteractionOut`, `AgentInvokeRequest`, `AgentInvokeResponse`) match TypeScript types in `frontend/src/api/*`.

Plan is internally consistent and complete.
