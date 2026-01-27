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
    created_at: str | None = None


class PostCreate(BaseModel):
    quest_id: str
    media_url: str
    media_type: str  # "image" | "video"


class PostOut(BaseModel):
    id: str
    quest_id: str
    media_url: str
    media_type: str
    votes: int
    created_at: str | None = None
    quest_title: str | None = None
    quest_icon: str | None = None
    poster_username: str | None = None
    poster_pfp_url: str | None = None


class CommentCreate(BaseModel):
  content: str


class CommentOut(BaseModel):
  id: str
  post_id: str
  user_id: str
  username: str | None = None
  pfp_url: str | None = None
  content: str
  created_at: str | None = None
