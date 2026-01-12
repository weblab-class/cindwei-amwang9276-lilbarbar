from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import ConstellationLayout
from ..security import get_current_user_id
import json

router = APIRouter(prefix="/constellation")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_layout(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    layout = db.query(ConstellationLayout).filter_by(user_id=user_id).first()
    if not layout:
        return {"badges": [], "lines": []}
    return json.loads(layout.data)

@router.post("/")
def save_layout(
    payload: dict,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    layout = db.query(ConstellationLayout).filter_by(user_id=user_id).first()
    data = json.dumps(payload)

    if layout:
        layout.data = data
    else:
        layout = ConstellationLayout(user_id=user_id, data=data)
        db.add(layout)

    db.commit()
    return {"ok": True}
