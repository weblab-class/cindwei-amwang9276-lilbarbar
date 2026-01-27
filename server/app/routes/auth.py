from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import User
from ..schemas import UserCreate
from ..security import hash_password, verify_password, create_token

router = APIRouter(prefix="/auth")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/signup")
def signup(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="USERNAME_TAKEN")

    user = User(username=data.username, password=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Handle race condition where username was taken after the check.
        raise HTTPException(status_code=400, detail="USERNAME_TAKEN")
    db.refresh(user)

    return {
        "token": create_token(user.id),
        "user": {
            "id": user.id,
            "username": user.username
        }
    }

@router.post("/login")
def login(data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401)

    return {
        "token": create_token(user.id),
        "user": {
            "id": user.id,
            "username": user.username
        }
    }
