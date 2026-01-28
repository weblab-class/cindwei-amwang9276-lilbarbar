from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import CompletedQuest, Quest, ReceivedQuest
from ..schemas import QuestCreate, QuestOut
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

@router.get("/", response_model=list[QuestOut])
def get_quests(
    period: str = Query("all", description="Filter by time period: 'all', 'month', 'week'"),
    db: Session = Depends(get_db),
):
    """
    Get quests ordered by votes, optionally filtered by time period.
    """
    now = datetime.utcnow()
    query = db.query(Quest)

    if period == "week":
        week_ago = now - timedelta(days=7)
        query = query.filter(Quest.created_at >= week_ago)
    elif period == "month":
        month_ago = now - timedelta(days=30)
        query = query.filter(Quest.created_at >= month_ago)
    # period == "all" or anything else: no date filter

    quests = query.order_by(Quest.votes.desc()).all()

    results = []
    for q in quests:
        results.append(
            QuestOut(
                id=q.id,
                title=q.title,
                icon=q.icon,
                votes=q.votes,
                created_at=q.created_at.isoformat() if q.created_at else None,
            )
        )
    return results

@router.post("/", response_model=QuestOut)
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
    db.refresh(quest)
    return QuestOut(
        id=quest.id,
        title=quest.title,
        icon=quest.icon,
        votes=quest.votes,
        created_at=quest.created_at.isoformat() if quest.created_at else None,
    )

@router.post("/{quest_id}/vote", response_model=QuestOut)
def vote(quest_id: str, delta: int, db: Session = Depends(get_db)):
    quest = db.query(Quest).get(quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    quest.votes += delta
    db.commit()
    db.refresh(quest)
    return QuestOut(
        id=quest.id,
        title=quest.title,
        icon=quest.icon,
        votes=quest.votes,
        created_at=quest.created_at.isoformat() if quest.created_at else None,
    )
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

    # Use created_at if available, otherwise use a default (1 hour ago for old quests)
    received_at = None
    if rq.created_at:
        received_at = rq.created_at.isoformat()
    else:
        # Fallback for old quests without created_at
        from datetime import datetime, timedelta
        received_at = (datetime.utcnow() - timedelta(hours=1)).isoformat()

    return {
        "quest_id": quest.id,
        "icon": quest.icon,
        "title": quest.title,
        "received_at": received_at,
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


@router.get("/{quest_id}/received-at")
def get_quest_received_at(
    quest_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Get when the current user received a specific quest.
    Returns None if the quest was never received.
    """
    rq = (
        db.query(ReceivedQuest)
        .filter(
            ReceivedQuest.quest_id == quest_id,
            ReceivedQuest.user_id == user_id,
        )
        .first()
    )
    
    if not rq or not rq.created_at:
        # Fallback for old quests without created_at
        from datetime import datetime, timedelta
        return {"received_at": (datetime.utcnow() - timedelta(hours=1)).isoformat()}
    
    return {"received_at": rq.created_at.isoformat()}


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
                    "quest_id": cq.quest_id,
                    "title": q.title,
                    "icon": q.icon,
                }
            )
    return results


@router.get("/completed/by-user/{user_id}")
def get_completed_quests_for_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    """
    Return all quests that the specified user has completed.

    Auth is still required (via get_current_user_id), but the caller can
    request badges for any user id they are allowed to see.
    """
    cqs = db.query(CompletedQuest).filter(CompletedQuest.user_id == user_id).all()
    results = []
    for cq in cqs:
        q = db.get(Quest, cq.quest_id)
        if q:
            results.append(
                {
                    "id": cq.id,
                    "quest_id": cq.quest_id,
                    "title": q.title,
                    "icon": q.icon,
                }
            )
    return results


@router.post("/backfill_created_at")
def backfill_quest_created_at(
    db: Session = Depends(get_db),
):
    """
    One-off helper to set created_at to 2 hours ago for all quests that don't have it.
    Run this once to backfill existing quests.
    """
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    quests = db.query(Quest).filter(Quest.created_at.is_(None)).all()
    updated = 0
    for q in quests:
        q.created_at = two_hours_ago
        updated += 1
    db.commit()

    return {"updated": updated}


@router.get("/{quest_id}/difficulty")
def get_quest_difficulty(
    quest_id: str,
    db: Session = Depends(get_db),
):
    """
    Calculate quest difficulty based on completion rate.
    Returns completion percentage (0-100).
    """
    received_count = db.query(ReceivedQuest).filter(ReceivedQuest.quest_id == quest_id).count()
    completed_count = db.query(CompletedQuest).filter(CompletedQuest.quest_id == quest_id).count()
    
    if received_count == 0:
        completion_rate = 100.0  # If no one received it, treat as 100% (easiest)
    else:
        completion_rate = (completed_count / received_count) * 100.0
    
    return {"completion_rate": completion_rate}


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

