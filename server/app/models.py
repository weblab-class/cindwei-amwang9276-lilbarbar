from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True)
    password = Column(String)

    quests = relationship("Quest", back_populates="creator")


class Quest(Base):
    __tablename__ = "quests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String)
    icon = Column(String)
    votes = Column(Integer, default=0)

    creator_id = Column(String, ForeignKey("users.id"))
    creator = relationship("User", back_populates="quests")
