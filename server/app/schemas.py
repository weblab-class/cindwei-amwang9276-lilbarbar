from pydantic import BaseModel

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
