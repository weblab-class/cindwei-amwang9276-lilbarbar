from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from .database import Base, engine
from .routes import auth, quests


Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(auth.router)
app.include_router(quests.router)
