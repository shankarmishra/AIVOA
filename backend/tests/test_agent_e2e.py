from unittest.mock import patch
from langchain_core.messages import AIMessage
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

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["final_text"] == "Logged the interaction."
    assert any(tc["name"] == "log_interaction" for tc in body["tool_calls"])
