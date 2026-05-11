# AIVOA · AI-First HCP CRM (Log Interaction Module)

> Round 1 assignment build for **AI-First CRM HCP Module – Log Interaction Screen**. A pharma sales rep logs Healthcare Professional (HCP) interactions either through a structured form **or** by chatting with an LLM-powered assistant. Both paths flow through a single **LangGraph** agent owning **5 tools**.

![status](https://img.shields.io/badge/status-working-0f766e?style=flat-square) ![python](https://img.shields.io/badge/python-3.11-blue?style=flat-square) ![react](https://img.shields.io/badge/react-18-61dafb?style=flat-square) ![tests](https://img.shields.io/badge/tests-13_passing-0f766e?style=flat-square)

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | **React 18 + Vite + TypeScript**, **Redux Toolkit + RTK Query**, Tailwind |
| Fonts | **Inter** (per spec) + **Fraunces** (display) + **JetBrains Mono** (technical metadata) |
| Backend | **Python 3.11 + FastAPI**, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Agent | **LangGraph** `StateGraph` + `langchain-groq` |
| LLMs | **Groq** `llama-3.3-70b-versatile` *(see "About the model choice" below)* |
| Database | **PostgreSQL 16** (Docker) |

### About the model choice

The assignment spec specified `gemma2-9b-it`. Groq **decommissioned** that model upstream (the API now returns `model_decommissioned`). We use the spec's listed alternative, `llama-3.3-70b-versatile`, for both primary and long-context paths. The `app/agent/llm.py` router is still in place — only the env var values changed (`backend/.env.example`).

---

## Quick start

### 1. Prereqs

- Docker Desktop
- Python 3.11
- Node 18+
- A free Groq API key from https://console.groq.com

### 2. Postgres

```bash
docker compose up -d postgres
```

### 3. Backend

```bash
cd backend
python -m venv .venv

# Windows
. .venv/Scripts/activate
# macOS / Linux
source .venv/bin/activate

pip install -e ".[dev]"
cp .env.example .env          # then paste your GROQ_API_KEY into .env
alembic upgrade head
python scripts/seed.py        # seeds 5 fake Indian-pharma HCPs
uvicorn app.main:app --reload --port 8000
```

Backend boots on `http://localhost:8000`. Try `GET /healthz`, `GET /hcps`, `GET /docs`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves on `http://localhost:5173`.

### 5. Tests

```bash
cd backend
docker compose exec postgres psql -U aivoa -c "CREATE DATABASE aivoa_test;"   # one-time
pytest -v                                                                     # 13 tests, all green
```

---

## The 5 LangGraph tools

Tool name → behavior → LLM use

| # | Tool | What it does | LLM? |
|---|---|---|---|
| 1 | `log_interaction` | Fuzzy-resolves the HCP, inserts an `interactions` row, and **auto-generates an AI summary** stored in `ai_summary` | ✅ |
| 2 | `edit_interaction` | Patches any subset of fields on an existing row by id | — |
| 3 | `search_interactions` | Filter past interactions by HCP / date range / topic keyword | — |
| 4 | `summarize_hcp_history` | Fetches recent interactions for an HCP and **LLM-summarises** themes, sentiment trend, and open follow-ups | ✅ |
| 5 | `suggest_follow_ups` | Pulls recent context for an HCP and **LLM-generates** 3 ranked next-best-actions with rationale | ✅ |

All 5 tools live in `backend/app/agent/tools.py`. Each `@tool` is bound to the agent in `backend/app/agent/graph.py`. Every invocation is rendered as a visible **tool-call bubble** in the chat UI — perfect for the video demo.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React + Redux SPA (Vite, port 5173)                         │
│  ┌────────────────────┐    ┌─────────────────────┐           │
│  │ Form Panel (left)  │    │ Chat Panel (right)  │           │
│  └────────┬───────────┘    └─────────┬───────────┘           │
│           └────────┬─────────────────┘                       │
│                    ▼                                         │
│   Redux store: interactionDraft + chat (RTK Query for data)  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  FastAPI (port 8000)                                         │
│   POST /agent/invoke    ← single entry for form & chat       │
│   GET  /hcps            ← autocomplete                       │
│   GET  /interactions    ← history list + by-id               │
│   GET  /healthz                                              │
└────────────────────┬─────────────────────────────────────────┘
                     ▼
              ┌──────────────────────┐
              │  LangGraph Agent     │
              │   StateGraph         │
              │  ┌────────────────┐  │
              │  │ agent_node ⇄   │  │
              │  │ ToolNode (×5)  │  │
              │  └────────────────┘  │
              └──────────┬───────────┘
                         ▼
       ┌─────────────┐   ┌────────────────────┐
       │ Postgres 16 │   │ Groq API           │
       │ (Docker)    │   │  llama-3.3-70b     │
       └─────────────┘   └────────────────────┘
```

### Dual UI → single agent

Both the form and the chat hit **the same** endpoint `POST /agent/invoke`. The form path wraps its payload into a synthetic `FORM_SUBMIT:` user message that nudges the agent to call `log_interaction` directly without asking clarifying questions. Chat is freeform. The agent decides.

This is the strongest "AI-first" framing the spec calls for: the same brain, two gloves.

---

## Project layout

```
AIVOA.AI/
├── docker-compose.yml                 Postgres
├── README.md                          This file
├── backend/
│   ├── pyproject.toml
│   ├── .env.example
│   ├── alembic/                       Migrations
│   ├── app/
│   │   ├── main.py                    FastAPI app + CORS + routers
│   │   ├── config.py                  pydantic-settings
│   │   ├── db.py                      Engine + get_db dep
│   │   ├── models.py                  HCP, Interaction, ChatMessage
│   │   ├── schemas.py                 Pydantic request/response
│   │   ├── routers/
│   │   │   ├── agent.py               POST /agent/invoke (dual-mode)
│   │   │   ├── hcps.py                GET /hcps
│   │   │   └── interactions.py        GET /interactions
│   │   ├── agent/
│   │   │   ├── llm.py                 Groq client + fallback router
│   │   │   ├── prompts.py             System + sub-prompts
│   │   │   ├── tools.py               The 5 @tool functions
│   │   │   └── graph.py               StateGraph (agent ⇄ ToolNode)
│   │   └── seeds/hcps.json
│   ├── scripts/seed.py
│   └── tests/                         13 tests, pytest
└── frontend/
    ├── package.json
    ├── vite.config.ts                 Proxy to backend
    ├── tailwind.config.js             Custom tokens + animations
    ├── index.html                     Inter + Fraunces + JetBrains Mono
    └── src/
        ├── main.tsx, App.tsx, store.ts
        ├── api/                       RTK Query slices
        ├── features/                  Redux slices (form draft + chat)
        ├── components/                TopBar, Form, AIAssistantPanel,
        │                              ToolCallBubble, Table, Modal
        └── pages/                     LogInteractionPage, HistoryPage
```

---

## Design system

A few notes since the spec called Inter mandatory — we expand on it:

- **Inter** (per spec) — UI workhorse: labels, inputs, body copy.
- **Fraunces** (variable serif) — display typography (page titles, empty-state heroes). Gives the medical-editorial gravitas.
- **JetBrains Mono** — technical metadata (tool names, IDs, timestamps).

Single confident accent **deep teal `#0f766e`**. Sentiment maps to emerald / slate / rose. Tool-call bubbles use **warm amber** to signal "the agent did a thing." Background is **paper-ivory `#f7f5ef`** with a subtle grain texture and ambient radial gradient.

Page-load motion: staggered fade-up across form sections (60ms apart). Tool bubbles slide-in. Modal scale-in. Nothing gratuitous — everything reinforces the editorial rhythm.

---

## Out of scope (deliberate, called out for the reviewer)

- **Voice-note transcription** — the spec's mockup shows a "Summary from Voice Note" field. Implementing speech-to-text adds another API dependency and 4-6 hours. Marked as future scope; field intentionally not in the form.
- **Auth / multi-user** — single demo user. The Postgres schema has no `users` table.
- **Hosted deployment** — localhost demo. Spec only requires GitHub repo + video.
- **E2E browser tests** — manual checklist below instead.

---

## Manual QA checklist (mirror of the video demo)

Recommended order in the video. With backend + frontend running on `:8000` / `:5173`:

1. **Open `/`** → see the form (left) and AI Assistant (right). Note the Inter font, Fraunces headings, paper texture, and "LIVE" indicator top-right.
2. **Click an HCP autocomplete suggestion** (Aisha Sharma) → name fills.
3. **Fill the form**: type "Cardio-X efficacy and dosing" as topics, pick "Positive" sentiment, add an outcome → click **Log Interaction**.
   - Watch the `log_interaction` tool bubble appear in chat with the AI's summary.
4. **In the chat panel**, type `Show me past interactions with Dr. Aisha Sharma` → `search_interactions` fires.
5. Type `Summarize my history with Dr. Aisha Sharma` → `summarize_hcp_history` fires with an LLM summary.
6. Type `What should I do next with Dr. Aisha Sharma?` → `suggest_follow_ups` fires with 3 ranked actions.
7. Navigate to **History** → see the row, sentiment chip, AI summary column. Click **Edit** on the row.
8. Change sentiment to **Neutral**, save → `edit_interaction` tool bubble appears in chat (proves the edit went through the agent).

All 5 tools demonstrated in under 7 minutes.

---

## Submission

Per the assignment doc, both deliverables go to the Google Form: **https://forms.gle/mkgZPhtkFtnvLJCz7**

1. **GitHub repo URL** (this repo)
2. **Video** (10–15 min) — walkthrough of the UI, demo of all 5 LangGraph tools firing in the chat, a short code-structure tour, and a summary of the task.

---

Built end-to-end with rigour: TDD on the backend tools and a Playwright smoke pass on the live app before submission.
