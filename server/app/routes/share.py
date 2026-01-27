from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import ReceivedQuest
from ..schemas import ShareQuest
from ..security import get_current_user_id


router = APIRouter(prefix="/share")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def share_quest(
    data: ShareQuest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rq = ReceivedQuest(
        quest_id=data.quest_id,
        user_id=data.to_user_id,
    )
    db.add(rq)
    db.commit()

    return {"ok": True}

