import uuid
from datetime import datetime
from app.models import HCP, Interaction, Sentiment


class _NoCloseSession:
    """Wraps a SQLAlchemy session so that tool-internal `db.close()` does not
    end the test fixture's session."""

    def __init__(self, inner):
        self._inner = inner

    def __getattr__(self, item):
        return getattr(self._inner, item)

    def close(self):
        pass


def _patch_session(monkeypatch, db):
    monkeypatch.setattr("app.agent.tools._db_session", lambda: _NoCloseSession(db))


def test_log_interaction_creates_row(db, monkeypatch):
    hcp = HCP(name="Dr. Aisha Sharma", specialty="Cardiology")
    db.add(hcp)
    db.commit()

    monkeypatch.setattr("app.agent.tools.quick_completion", lambda p: "Test summary.")
    _patch_session(monkeypatch, db)

    from app.agent.tools import log_interaction
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


def test_log_interaction_unknown_hcp_returns_error(db, monkeypatch):
    _patch_session(monkeypatch, db)
    from app.agent.tools import log_interaction
    result = log_interaction.invoke({
        "hcp_name": "Dr. Nonexistent",
        "interaction_type": "Meeting",
        "occurred_at": "2026-05-11T10:00:00",
        "topics_discussed": "x",
    })
    assert "error" in result


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

    _patch_session(monkeypatch, db)
    from app.agent.tools import edit_interaction
    result = edit_interaction.invoke({
        "interaction_id": str(interaction.id),
        "topics_discussed": "New topic",
        "sentiment": "positive",
    })

    assert result.get("status") == "ok"
    refreshed = db.get(Interaction, interaction.id)
    assert refreshed.topics_discussed == "New topic"
    assert refreshed.sentiment == Sentiment.positive


def test_edit_interaction_missing_id_returns_error(db, monkeypatch):
    _patch_session(monkeypatch, db)
    from app.agent.tools import edit_interaction
    result = edit_interaction.invoke({
        "interaction_id": str(uuid.uuid4()),
        "topics_discussed": "x",
    })
    assert "error" in result


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

    _patch_session(monkeypatch, db)
    from app.agent.tools import search_interactions
    result = search_interactions.invoke({"hcp_name": "Searched"})

    assert "results" in result
    assert len(result["results"]) == 1
    assert result["results"][0]["interaction_type"] == "Meeting"


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

    _patch_session(monkeypatch, db)
    monkeypatch.setattr("app.agent.tools.quick_completion", lambda p: "Test history summary.")

    from app.agent.tools import summarize_hcp_history
    result = summarize_hcp_history.invoke({"hcp_name": "Summary"})

    assert "summary" in result
    assert result["summary"] == "Test history summary."
    assert result["interactions_used"] == 2


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

    _patch_session(monkeypatch, db)
    monkeypatch.setattr(
        "app.agent.tools.quick_completion",
        lambda p: '[{"action": "Send brochure", "rationale": "Asked for info"}]',
    )

    from app.agent.tools import suggest_follow_ups
    result = suggest_follow_ups.invoke({"hcp_name": "Followup"})

    assert "suggestions" in result
    assert isinstance(result["suggestions"], list)
    assert result["suggestions"][0]["action"] == "Send brochure"
