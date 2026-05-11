from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import get_db
from app.models import HCP
from app.schemas import HCPOut

router = APIRouter(prefix="/hcps", tags=["hcps"])


@router.get("", response_model=list[HCPOut])
def list_hcps(q: str | None = None, db: Session = Depends(get_db)) -> list[HCP]:
    stmt = select(HCP)
    if q:
        stmt = stmt.where(HCP.name.ilike(f"%{q}%"))
    return list(db.execute(stmt.order_by(HCP.name).limit(20)).scalars())
