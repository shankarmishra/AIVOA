# AI-First CRM — HCP Module: Log Interaction Screen

**Status:** Approved
**Date:** 2026-05-11
**Deadline:** 36 hours from assignment receipt
**Source:** Naukri assignment — "AI-First CRM HCP Module – Log Interaction Screen (Technical)"

## 1. Purpose

Build the Log Interaction Screen for an AI-First Healthcare CRM. A pharma sales rep can log
interactions with a Healthcare Professional (HCP) either through a structured form **or** by
chatting with an LLM-powered assistant on the same screen. Both paths are routed through a
single LangGraph agent that owns 5 tools.

## 2. Mandatory constraints (from spec)

- LangGraph **must** be used as the agent framework.
- An LLM **must** drive the assistant. Use Groq `gemma2-9b-it` as the primary model;
  `llama-3.3-70b-versatile` is the long-context fallback.
- Frontend: React + Redux.
- Backend: Python + FastAPI.
- Database: PostgreSQL (chosen from MySQL/Postgres options).
- Font: Google Inter.
- Output: GitHub repo (frontend + backend, one repo) + README + 10–15 min video.

## 3. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React + Redux SPA (Vite, port 5173)                         │
│  ┌────────────────────┐    ┌─────────────────────┐           │
│  │ Form Panel (left)  │    │ Chat Panel (right)  │           │
│  └────────┬───────────┘    └─────────┬───────────┘           │
│           └────────┬─────────────────┘                       │
│                    ▼                                         │
│   Redux store: interactionDraft + chatHistory                │
└────────────────────┬─────────────────────────────────────────┘
                     │  fetch / SSE
                     ▼
┌──────────────────────────────────────────────────────────────┐
│  FastAPI (port 8000)                                         │
│   POST /agent/invoke   ← single entry for form & chat        │
│   GET  /interactions   ← list/search                         │
│   GET  /hcps           ← autocomplete                        │
│   GET  /healthz                                              │
└────────────────────┬─────────────────────────────────────────┘
                     ▼
              ┌──────────────────────┐
              │  LangGraph Agent     │
              │   (StateGraph)       │
              │  Router → ToolNode   │
              │  5 tools             │
              └──────────┬───────────┘
                         ▼
       ┌─────────────┐   ┌────────────────────┐
       │ Postgres 16 │   │ Groq API           │
       │ (Docker)    │   │  gemma2-9b-it      │
       └─────────────┘   │  llama-3.3-70b     │
                         └────────────────────┘
```

**Architecture decision: single LangGraph agent feeds both UIs (Approach A).**
Form submission is wrapped into a synthetic user message instructing the agent to call
`log_interaction` directly; chat is freeform. Same endpoint, same graph. This gives the
strongest "AI-first" demo and shows all 5 tools in one walkthrough.

## 4. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript, Redux Toolkit, RTK Query, Tailwind |
| Font | Google Inter (loaded in `index.html`) |
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic |
| Agent | LangGraph + langchain-groq |
| LLMs | `gemma2-9b-it` (default), `llama-3.3-70b-versatile` (long-context fallback) |
| DB | PostgreSQL 16 (Docker) |
| Repo | Monorepo: `/frontend`, `/backend`, `docker-compose.yml`, `README.md` |

## 5. Data model

```sql
hcps
  id (uuid PK), name, specialty, institution, created_at

interactions
  id (uuid PK), hcp_id (FK), interaction_type, occurred_at,
  attendees (text), topics_discussed (text),
  materials_shared (jsonb), samples_distributed (jsonb),
  sentiment (enum: positive|neutral|negative),
  outcomes (text), follow_up_actions (text),
  ai_summary (text NULL),
  ai_suggestions (jsonb NULL),
  created_at, updated_at

chat_messages
  id, session_id, role (user|assistant|tool),
  content (text), tool_name (text NULL),
  tool_args (jsonb NULL), created_at
```

Seed 5 fake HCPs on first boot for demo data.

## 6. LangGraph agent design

**Graph shape:** ReAct-style `StateGraph`.

```
START → agent_node → (tool calls?) → tool_node → agent_node → ... → END
```

**State:**
```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    current_draft: dict | None  # in-progress form fields for form-mode prefill
```

`agent_node` uses `ChatGroq(model="gemma2-9b-it", temperature=0.2).bind_tools([...])`.
A pre-call token-counter routes prompts > ~6k tokens to `llama-3.3-70b-versatile`.

System prompt frames the agent as a life-science sales-rep assistant for a pharma CRM.

### The 5 tools

| # | Tool | Behavior | LLM use |
|---|---|---|---|
| 1 | `log_interaction` | Resolves HCP by fuzzy name → inserts row → secondary LLM call generates `ai_summary` | ✅ summary |
| 2 | `edit_interaction` | Patches an existing row by id; validates id exists | — |
| 3 | `search_interactions` | SQL filter by hcp/date/topic; returns trimmed list | — |
| 4 | `summarize_hcp_history` | Pulls last N interactions for HCP, LLM summarizes themes/trend/open follow-ups | ✅ summary |
| 5 | `suggest_follow_ups` | Pulls recent context, LLM returns 3 ranked next-best-actions with rationale | ✅ generation |

Each tool invocation is appended to `chat_messages` with `tool_name` + `tool_args` for the
video demo to surface visually.

### Dual UI → single graph

- **Chat:** `{role: "user", content: <freeform>}` → agent decides which tool to call.
- **Form submit:** synthetic message `"Log this interaction: <JSON of form fields>"` with a
  system hint that tells the agent to call `log_interaction` directly without follow-up
  clarification.

## 7. API surface

```
POST /agent/invoke
  body: { session_id, message, mode: "chat"|"form", form_data?: object }
  → { messages: [...], tool_calls: [...], final_text: str }

GET  /hcps?q=<prefix>             autocomplete for form
GET  /interactions?hcp_id=&from=  list view
GET  /interactions/{id}           single (for edit)
GET  /healthz                     {status, db, groq}
```

### Error handling
- Groq 429/5xx → catch in `agent_node` → retry once with `llama-3.3-70b-versatile` →
  graceful "AI unavailable, please use form" message.
- DB errors → FastAPI exception handler → JSON `{error, code}`.
- Tool validation errors → tool returns `{"error": "..."}` as its output; agent narrates
  the error back to the user instead of crashing.

## 8. Frontend

**Pages**
- `/` — Log Interaction Screen (form left ~60%, chat right ~40%)
- `/interactions` — table of past interactions, row click → edit modal

**Component tree**
```
<App>
 ├── <TopBar/>
 ├── <LogInteractionPage>
 │    ├── <InteractionForm/>
 │    │     ├── HCPField (autocomplete)
 │    │     ├── InteractionTypeSelect
 │    │     ├── DateTimePicker
 │    │     ├── TopicsTextarea
 │    │     ├── MaterialsShared (chips + search)
 │    │     ├── SamplesDistributed (add-row)
 │    │     ├── SentimentRadio
 │    │     ├── OutcomesTextarea
 │    │     ├── FollowUpsTextarea
 │    │     ├── AISuggestionsPanel
 │    │     └── <SaveButton/>
 │    └── <AIAssistantPanel/>
 │          ├── ChatMessageList
 │          └── ChatInput
 └── <InteractionsTablePage/>
```

**Redux slices**
```
interactionDraftSlice   { fields, isDirty, isSaving }
chatSlice               { sessionId, messages[], isStreaming }
hcpsApi (RTK Query)
interactionsApi (RTK Query)
```

Tool-call bubbles in chat render `🔧 log_interaction(...)` with collapsible args so the
video demo shows all 5 tools firing.

## 9. Repo layout

```
AIVOA.AI/
├── README.md                    # setup + run + tools list + demo script
├── docker-compose.yml           # postgres + (optional) backend
├── .env.example                 # GROQ_API_KEY, DATABASE_URL
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routers/
│   │   │   ├── agent.py
│   │   │   ├── hcps.py
│   │   │   └── interactions.py
│   │   ├── agent/
│   │   │   ├── graph.py
│   │   │   ├── tools.py
│   │   │   ├── prompts.py
│   │   │   └── llm.py
│   │   └── seeds/hcps.json
│   ├── alembic/
│   └── tests/
│       ├── test_tools.py
│       └── test_agent_e2e.py
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── store.ts
│       ├── api/
│       ├── features/
│       │   ├── interactionDraft/
│       │   └── chat/
│       ├── components/
│       └── pages/
└── docs/
    ├── demo-script.md
    └── superpowers/specs/
```

## 10. Testing

- **Backend:** pytest. One happy-path test per tool (5 tests) + one end-to-end test that
  runs the agent with a mocked Groq client returning canned tool calls.
- **Frontend:** no unit tests under deadline; manual checklist in README.
- **Demo script:** `docs/demo-script.md` mirrors the video deliverable.

## 11. 36-hour timebox

| Block | Hours | Output |
|---|---|---|
| Backend scaffold, Postgres up, models, Alembic | 3 | DB migrates, FastAPI boots |
| 5 LangGraph tools, agent graph, Groq wiring | 6 | `pytest tests/test_tools.py` green |
| `/agent/invoke` endpoint, dual-mode handling | 2 | curl works for both modes |
| Frontend scaffold (Vite + Redux + Tailwind + Inter) | 2 | Empty shell renders |
| Form panel (all fields + autocomplete) | 5 | Form posts to backend |
| Chat panel + tool-call bubbles + streaming | 4 | All 5 tools visible in UI |
| Interactions table + edit modal | 2 | Edit flow works |
| README + demo script + manual QA pass | 2 | Repo presentable |
| Video recording + submission | 2 | Form filled |
| Buffer (bug-fix / polish) | 8 | — |

## 12. Out of scope (called out in README)

- Voice-note transcription (field shown but disabled; marked "future scope")
- Auth / multi-user (single demo user)
- Hosted deployment (localhost demo)
- E2E browser tests

## 13. Deliverables

1. GitHub repo with `/frontend` + `/backend` + `README.md`.
2. Video (10–15 min): frontend walkthrough, demo of all 5 LangGraph tools firing,
   code-structure explanation, task-understanding summary.
3. Submission via the assignment Google Form.
