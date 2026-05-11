import uuid
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
    r = client.get(f"/interactions/{uuid.uuid4()}")
    assert r.status_code == 404
