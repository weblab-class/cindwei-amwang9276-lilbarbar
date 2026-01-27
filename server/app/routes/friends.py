from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User, friendships, FriendRequest
from ..security import get_current_user_id

router = APIRouter(prefix="/friends")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/add")
def add_friend(username: str, current_user_id: str, db: Session = Depends(get_db)):
    friend = db.query(User).filter(User.username == username).first()
    if not friend:
        return {"error": "User not found"}

    db.execute(friendships.insert().values(
        user_id=current_user_id,
        friend_id=friend.id
    ))
    db.commit()
    return {"ok": True}

@router.post("/request")
def send_request(
    username: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")

    existing = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.from_user_id == user_id,
            FriendRequest.to_user_id == target.id,
            FriendRequest.status == "pending",
        )
        .first()
    )

    if existing:
        raise HTTPException(400, "Request already sent")

    fr = FriendRequest(
        from_user_id=user_id,
        to_user_id=target.id,
    )

    db.add(fr)
    db.commit()
    return {"ok": True}

@router.get("/incoming")
def incoming_requests(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    requests = (
        db.query(FriendRequest)
        .filter(
            FriendRequest.to_user_id == user_id,
            FriendRequest.status == "pending",
        )
        .all()
    )

    return [
        {
            "id": r.id,
            "from_user_id": r.from_user_id,
            "from_username": (
                db.get(User, r.from_user_id).username
                if db.get(User, r.from_user_id)
                else None
            ),
        }
        for r in requests
    ]

@router.post("/{request_id}/respond")
def respond_request(
    request_id: str,
    accept: bool,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    fr = db.query(FriendRequest).get(request_id)

    if not fr or fr.to_user_id != user_id:
        raise HTTPException(404)

    fr.status = "accepted" if accept else "rejected"
    db.commit()

    return {"status": fr.status}

@router.get("/list")
def list_friends(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    accepted = (
        db.query(FriendRequest)
        .filter(
            (
                (FriendRequest.from_user_id == user_id) |
                (FriendRequest.to_user_id == user_id)
            ),
            FriendRequest.status == "accepted"
        )
        .all()
    )

    friend_ids = [
        r.from_user_id if r.to_user_id == user_id else r.to_user_id
        for r in accepted
    ]

    friends = db.query(User).filter(User.id.in_(friend_ids)).all()

    return [{"id": f.id, "username": f.username} for f in friends]

