from sqlalchemy import Table, Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
from .database import Base
import uuid


class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_user_id = Column(String, ForeignKey("users.id"))
    to_user_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="pending")  # pending | accepted | rejected

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True)
    password = Column(String)
    # Cloudflare R2 profile picture object key (used to derive signed URL)
    pfp_key = Column(String, nullable=True)

    quests = relationship("Quest", back_populates="creator")


class Quest(Base):
    __tablename__ = "quests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String)
    icon = Column(String)
    votes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator_id = Column(String, ForeignKey("users.id"))
    creator = relationship("User", back_populates="quests")


friendships = Table(
    "friendships",
    Base.metadata,
    Column("user_id", String, ForeignKey("users.id")),
    Column("friend_id", String, ForeignKey("users.id")),
)


class ReceivedQuest(Base):
    __tablename__ = "received_quests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    quest_id = Column(String, ForeignKey("quests.id"))
    status = Column(String, default="received")  # received | completed


class CompletedQuest(Base):
    __tablename__ = "completed_quests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    quest_id = Column(String, ForeignKey("quests.id"))


class Post(Base):
    __tablename__ = "posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quest_id = Column(String, ForeignKey("quests.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    media_url = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # "image" | "video"
    votes = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    quest = relationship("Quest")


class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, ForeignKey("posts.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
