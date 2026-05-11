import json
import uuid
from datetime import datetime
from typing import Annotated
from langchain_core.tools import tool
from sqlalchemy import select
from app.db import SessionLocal
from app.models import HCP, Interaction, Sentiment
from app.agent.llm import quick_completion
from app.agent.prompts import SUMMARY_PROMPT, HISTORY_SUMMARY_PROMPT, FOLLOW_UP_PROMPT


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
    materials_shared: Annotated[list[str] | None, "Materials shared"] = None,
    samples_distributed: Annotated[list[dict] | None, "Samples distributed"] = None,
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
