from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Quest
from ..schemas import QuestCreate

router = APIRouter(prefix="/quests")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def get_quests(db: Session = Depends(get_db)):
    return db.query(Quest).order_by(Quest.votes.desc()).all()

@router.post("/")
def create_quest(data: QuestCreate, db: Session = Depends(get_db)):
    quest = Quest(title=data.title, icon=data.icon)
    db.add(quest)
    db.commit()
    return quest

@router.post("/{quest_id}/vote")
def vote(quest_id: str, delta: int, db: Session = Depends(get_db)):
    quest = db.query(Quest).get(quest_id)
    quest.votes += delta
    db.commit()
    return quest
