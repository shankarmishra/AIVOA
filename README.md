# AIVOA · AI-First Healthcare Professional (HCP) CRM Agent

> Turning natural-language conversations into structured CRM actions.

![python](https://img.shields.io/badge/python-3.12-blue?style=flat-square) ![fastapi](https://img.shields.io/badge/fastapi-0.115-009688?style=flat-square) ![langgraph](https://img.shields.io/badge/langgraph-state__graph-0f766e?style=flat-square) ![groq](https://img.shields.io/badge/groq-llama--3.3--70b-orange?style=flat-square) ![postgres](https://img.shields.io/badge/postgresql-16-336791?style=flat-square) ![react](https://img.shields.io/badge/react-18-61dafb?style=flat-square) ![tests](https://img.shields.io/badge/pytest-13_passed-0f766e?style=flat-square)

---

## 📄 Executive Summary & Product Architecture

**AIVOA** is an AI-First CRM application designed to eliminate manual data entry overhead for pharmaceutical sales representatives. Healthcare Professional (HCP) meeting logs and field interactions can be submitted either through a **structured form interface** or via an **interactive natural-language AI Assistant chat**.

Both submission modes route through a single, unified **LangGraph Agent (`StateGraph`)** that dynamically selects and executes 5 custom CRM tools.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Redux Toolkit + RTK Query, Tailwind CSS |
| **Typography** | Inter (UI), Fraunces (Display), JetBrains Mono (Technical Metadata) |
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| **AI Agent Loop** | LangGraph `StateGraph` + `ToolNode` architecture |
| **LLM Provider** | Groq API (`llama-3.3-70b-versatile`) |
| **Database** | PostgreSQL 16 relational database persistence |
| **Test Suite** | Pytest (13 automated unit, tool, & E2E agent tests) |

---

## ⚙️ Architecture & Dual UI Flow

```
┌──────────────────────────────────────────────────────────────┐
│  React 18 + Redux SPA (Vite, port 5173)                      │
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
│  FastAPI Async Backend (port 8000)                           │
│   POST /agent/invoke    ← Dual-mode entry for form & chat    │
│   GET  /hcps            ← Autocomplete doctor search         │
│   GET  /interactions    ← History records + by-id            │
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
       │ PostgreSQL  │   │ Groq API           │
       │ 16 Database │   │  llama-3.3-70b     │
       └─────────────┘   └────────────────────┘
```

### Dual UI ➔ Single Agent Execution Model
Both form submissions and freeform chat messages hit the single endpoint `POST /agent/invoke`. Form inputs are encapsulated into a structured `FORM_SUBMIT:` payload that guides the agent to invoke `log_interaction` directly, while natural-language chat queries allow the agent to autonomously reason, select, and route across all 5 custom tools.

---

## 🔧 The 5 Custom LangGraph Tools

| # | Tool Name | Description & Execution Logic | LLM Driven? |
|---|---|---|---|
| 1 | `log_interaction` | Fuzzy-resolves HCP doctor name, inserts `interactions` database record, and auto-generates AI meeting summary. | ✅ |
| 2 | `edit_interaction` | Patches any subset of fields on an existing interaction row by UUID. | — |
| 3 | `search_interactions` | Filters past interactions by doctor name, date range, or topic keyword. | — |
| 4 | `summarize_hcp_history` | Fetches recent interaction records for an HCP and generates an LLM analytical breakdown of sentiment trends and open follow-ups. | ✅ |
| 5 | `suggest_follow_ups` | Analyzes recent HCP context and generates 3 ranked next-best-actions with strategic rationale. | ✅ |

All custom tools are defined in `backend/app/agent/tools.py` and bound to the agent graph in `backend/app/agent/graph.py`.

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 16
- A Groq API Key (from https://console.groq.com)

### 2. Environment Configuration
Create `backend/.env` file:
```env
DATABASE_URL=postgresql://aivoa:aivoa@localhost:5432/aivoa
TEST_DATABASE_URL=postgresql://aivoa:aivoa@localhost:5432/aivoa_test
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows Powershell
.venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run Alembic migrations & seed HCP records
alembic upgrade head
python scripts/seed.py

# Start Uvicorn backend server
uvicorn app.main:app --port 8000
```
Backend boots on `http://localhost:8000`. Test endpoints at `http://localhost:8000/docs`.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend serves on `http://localhost:5173`.

### 5. Automated Pytest Verification
```bash
cd backend
pytest -v
```
Runs 13 automated unit, tool, and end-to-end agent tests (`13 passed in 1.36s`).

---

## 📁 Repository Structure

```
AIVOA/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py               # StateGraph agent topology & tool router
│   │   │   ├── llm.py                 # Groq LLM client wrapper & fallback router
│   │   │   ├── prompts.py             # System prompts & analytical templates
│   │   │   └── tools.py               # The 5 custom @tool functions
│   │   ├── models.py                  # SQLAlchemy 2.0 ORM models (HCP, Interaction)
│   │   ├── routers/
│   │   │   ├── agent.py               # POST /agent/invoke endpoint
│   │   │   ├── hcps.py                # GET /hcps autocomplete endpoint
│   │   │   └── interactions.py        # GET /interactions endpoint
│   │   └── main.py                    # FastAPI application entry point
│   ├── alembic/                       # Database schema migration scripts
│   ├── scripts/seed.py                # HCP database seeding script
│   └── tests/                         # 13 automated Pytest test cases
└── frontend/
    └── src/
        ├── api/                       # Redux RTK Query API slices
        ├── components/                # Form, Chat Panel, ToolCallBubble, History Table
        └── pages/                     # LogInteractionPage & HistoryPage
```

---

## 📄 License & Attribution

Developed as a modern AI-First SaaS Application for Healthcare Professional CRM Workflow Automation.
