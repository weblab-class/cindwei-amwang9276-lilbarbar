from pydantic import BaseModel


class ShareQuest(BaseModel):
    quest_id: str
    to_user_id: str


class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    username: str

class QuestCreate(BaseModel):
    title: str
    icon: str

class QuestOut(BaseModel):
    id: str
    title: str
    icon: str
    votes: int
