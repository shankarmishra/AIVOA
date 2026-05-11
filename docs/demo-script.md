# Video Demo Script (10–15 minutes)

> Record at 1080p or higher. Keep DevTools open in one screen segment to show network requests / Inter font in computed styles.

## Setup (do BEFORE recording)

```bash
# in 3 terminals or 1 with tmux/windows-terminal panes:
docker compose up -d postgres
cd backend && . .venv/Scripts/activate && uvicorn app.main:app --port 8000
cd frontend && npm run dev
```

Open `http://localhost:5173`, dismiss any browser dialogs, refresh once to be sure.

---

## 1. Intro · ~1 min

- "Hi, I'm Shankar. This is my Round 1 submission for the AI-First CRM HCP Module — the Log Interaction Screen."
- Open the assignment doc on screen for two seconds.
- "Mandatory stack: LangGraph, an LLM (Groq), React + Redux, Python + FastAPI, Postgres, Inter. Let me walk through what I built."

## 2. UI walkthrough · ~2 min

- Open `http://localhost:5173/`.
- **TopBar**: AIVOA wordmark in Fraunces serif, "LIVE" pulse indicator, user avatar.
- **Form panel (left)**: walk through every field — HCP autocomplete (type "ai" → Aisha Sharma surfaces from the seed data), interaction type as toggle pills, datetime picker, attendees, topics, sentiment radios, outcomes, follow-ups.
- **Chat panel (right)**: empty-state hero in Fraunces italic — "Hello. *What happened today?*" — three quick-prompt suggestions, and a tool legend showing the 5 tools.
- Open DevTools → Computed → confirm `font-family: "Inter", system-ui, sans-serif` on body (Inter is mandated by spec).
- Navigate to **History** tab → editorial table layout with sentiment chips.

## 3. Demo all 5 LangGraph tools · ~6 min

For each tool: type the prompt, watch the tool-call bubble appear, then expand it to show args + result.

### Tool 1 — `log_interaction` (via chat)

Prompt:
> Log a meeting with Dr. Aisha Sharma on 2026-05-11T14:00:00. We discussed Cardio-X efficacy and dosing. She was positive and asked for the latest clinical trial PDFs. Follow-up: send Phase III data.

- Watch the amber **TOOL · LOG INTERACTION** bubble appear.
- Expand it: show the `args` (hcp_name, interaction_type, topics_discussed, sentiment, etc.) and `result` (interaction_id, ai_summary).
- Read the assistant's plain-English confirmation below.

### Tool 2 — `search_interactions`

Prompt:
> Show me my recent interactions with Dr. Aisha Sharma.

- `search_interactions` bubble fires.
- Expand → see the trimmed list of interactions returned to the LLM.

### Tool 3 — `summarize_hcp_history`

Prompt:
> Summarize my history with Dr. Aisha Sharma.

- `summarize_hcp_history` bubble fires.
- Expand → see the LLM-generated themes / sentiment trend.

### Tool 4 — `suggest_follow_ups`

Prompt:
> What should I do next with Dr. Aisha Sharma?

- `suggest_follow_ups` bubble fires.
- Expand → see 3 ranked next-best-actions with rationale (JSON).

### Tool 5 — `edit_interaction` (via the History page)

- Navigate to History tab.
- Click **Edit** on the row we just created.
- Modal opens. Change sentiment to **Neutral**, click **Save via AI**.
- Modal closes; switch back to the Log Interaction tab to see the `edit_interaction` tool bubble in chat.

## 4. Form path · ~1 min

- Back on the Log Interaction page, fill the form normally:
  - HCP: Dr. Rohan Mehta
  - Type: Call
  - Topics: "Onco-Y safety profile"
  - Sentiment: Neutral
  - Outcomes: "Will review next quarter"
- Click **Log Interaction** → notice the **same** `log_interaction` tool-call bubble appears in the right panel.
- "Form submits go through the same LangGraph agent — they're wrapped into a `FORM_SUBMIT:` message that nudges the agent to call `log_interaction` directly. Same brain, different glove."

## 5. Code walkthrough · ~3 min

Open the project in your editor in this order:

1. **`backend/app/agent/tools.py`** — the 5 `@tool` functions. Note `quick_completion` for tool-internal LLM calls (summary inside `log_interaction`).
2. **`backend/app/agent/graph.py`** — `StateGraph` build: `agent_node` → conditional → `ToolNode` → back to `agent_node`. Standard ReAct loop.
3. **`backend/app/agent/llm.py`** — Groq client wrapper. Originally targeted `gemma2-9b-it` per spec; that model was decommissioned by Groq, so we use `llama-3.3-70b-versatile` (the spec's listed alternative). Documented in the README.
4. **`backend/app/routers/agent.py`** — `POST /agent/invoke`. Dual-mode handling: if `mode=form`, wrap `form_data` into a `FORM_SUBMIT:` synthetic message.
5. **`frontend/src/components/AIAssistantPanel.tsx`** — chat panel and how it renders the tool-call bubbles via the `ToolCallBubble` component.
6. **`frontend/src/components/InteractionForm.tsx`** — the form. Submit dispatches `useInvokeAgentMutation({ mode: "form", form_data })`.

Mention: 13 backend tests passing (`pytest`), each tool has a happy-path test, plus an end-to-end test with a mocked Groq client.

## 6. Wrap · ~1 min

- Recap: dual UI, single LangGraph agent, 5 tools, all required tech satisfied. Inter font verified.
- Out-of-scope (called out in README): voice-note transcription, auth, hosted deploy.
- "Repo and this video go to the submission form. Thanks for reviewing."

---

## Common pitfalls during recording

- **Dev server on wrong port?** If port 5173 is occupied, Vite falls back to 5174. Kill the other dev server first.
- **Groq 429 / rate limit?** Wait 30 seconds, the free tier has tight per-minute limits.
- **DB empty?** Run `python scripts/seed.py` before recording.
- **`alembic upgrade head` complains about no migrations?** That's fine; the initial migration is committed at `backend/alembic/versions/ba679e1a59ed_initial_schema.py`.
