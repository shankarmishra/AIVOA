import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import get_db
from app.models import Interaction
from app.schemas import InteractionOut

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.get("", response_model=list[InteractionOut])
def list_interactions(
    hcp_id: str | None = None,
    from_: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    stmt = select(Interaction)
    if hcp_id:
        stmt = stmt.where(Interaction.hcp_id == uuid.UUID(hcp_id))
    if from_:
        stmt = stmt.where(Interaction.occurred_at >= datetime.fromisoformat(from_))
    stmt = stmt.order_by(Interaction.occurred_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars())


@router.get("/{interaction_id}", response_model=InteractionOut)
def get_interaction(interaction_id: str, db: Session = Depends(get_db)):
    row = db.get(Interaction, uuid.UUID(interaction_id))
    if row is None:
        raise HTTPException(404, "Interaction not found")
    return row
