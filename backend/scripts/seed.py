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
