from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Quest, ReceivedQuest, CompletedQuest, QuestVote, User
from ..schemas import QuestCreate, QuestOutWithVote
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

@router.get("/with_votes", response_model=list[QuestOutWithVote])
def get_quests_with_votes(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    quests = db.query(Quest).order_by(Quest.votes.desc()).all()
    quest_ids = [q.id for q in quests]
    vote_map: dict[str, int] = {}
    if quest_ids:
        votes = (
            db.query(QuestVote)
            .filter(QuestVote.user_id == user_id, QuestVote.quest_id.in_(quest_ids))
            .all()
        )
        vote_map = {v.quest_id: int(v.value) for v in votes}

    return [
        QuestOutWithVote(
            id=q.id,
            title=q.title,
            icon=q.icon,
            votes=q.votes,
            my_vote=vote_map.get(q.id, 0),
        )
        for q in quests
    ]

@router.post("/")
def create_quest(data: QuestCreate, db: Session = Depends(get_db)):
    quest = Quest(title=data.title, icon=data.icon)
    db.add(quest)
    db.commit()
    return quest

@router.post("/{quest_id}/vote")
def vote(
    quest_id: str,
    delta: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    quest = db.get(Quest, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    existing = (
        db.query(QuestVote)
        .filter(QuestVote.quest_id == quest_id, QuestVote.user_id == user_id)
        .first()
    )
    prev_value = int(existing.value) if existing else 0
    next_value = prev_value + int(delta)

    if next_value not in (-1, 0, 1):
        raise HTTPException(status_code=400, detail="Invalid vote transition")

    if next_value == 0:
        if existing:
            db.delete(existing)
    else:
        if existing:
            existing.value = next_value
            db.add(existing)
        else:
            db.add(QuestVote(quest_id=quest_id, user_id=user_id, value=next_value))

    quest.votes += delta
    db.commit()
    db.refresh(quest)
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


@router.get("/completed/by-username/{username}")
def get_completed_quests_by_username(
    username: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - ensure auth
):
    """
    Return completed quests (badges) for a given username.
    """
    u = db.query(User).filter(User.username == username).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    cqs = db.query(CompletedQuest).filter(CompletedQuest.user_id == u.id).all()
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

