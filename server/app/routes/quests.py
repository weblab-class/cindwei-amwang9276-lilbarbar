from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Quest, ReceivedQuest, CompletedQuest
from ..schemas import QuestCreate
from ..security import get_current_user_id

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

@router.post("/{quest_id}/complete")
def complete_quest(
    quest_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rq = (
        db.query(ReceivedQuest)
        .filter(
            ReceivedQuest.quest_id == quest_id,
            ReceivedQuest.user_id == user_id,
            ReceivedQuest.status == "received",
        )
        .first()
    )

    if not rq:
        raise HTTPException(404, "Quest not found")

    # prevent double completion
    existing = (
        db.query(CompletedQuest)
        .filter(
            CompletedQuest.user_id == user_id,
            CompletedQuest.quest_id == quest_id,
        )
        .first()
    )

    if existing:
        raise HTTPException(400, "Quest already completed")

    rq.status = "completed"

    completed = CompletedQuest(
        user_id=user_id,
        quest_id=quest_id,
    )

    db.add(completed)
    db.commit()

    quest = db.get(Quest, quest_id)

    return {
        "quest_id": quest.id,
        "icon": quest.icon,
        "title": quest.title,
    }


@router.get("/received")
def get_received_quests(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rqs = (
        db.query(ReceivedQuest)
        .filter(
            ReceivedQuest.user_id == user_id,
            ReceivedQuest.status == "received",
        )
        .all()
    )

    quests = []
    for rq in rqs:
        q = db.query(Quest).get(rq.quest_id)
        quests.append({
            "id": q.id,
            "title": q.title,
            "icon": q.icon,
        })

    return quests


@router.get("/completed")
def get_completed_quests(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Return all quests that the current user has completed, including their icons and titles.
    """
    cqs = db.query(CompletedQuest).filter(CompletedQuest.user_id == user_id).all()
    results = []
    for cq in cqs:
        q = db.get(Quest, cq.quest_id)
        if q:
            results.append(
                {
                    "id": cq.id,
                    "title": q.title,
                    "icon": q.icon,
                }
            )
    return results

