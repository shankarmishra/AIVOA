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
