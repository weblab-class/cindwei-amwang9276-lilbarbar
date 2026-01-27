from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text

from .database import Base, engine
from .routes import auth, friends, quests, share, posts, users


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Lightweight "migration" for local/dev: ensure users.pfp_key exists.
    # SQLAlchemy create_all() will NOT add new columns to existing tables.
    try:
        with engine.begin() as conn:
            # Some DBs (like SQLite) don't support IF NOT EXISTS here, so we just
            # try to add the column and ignore the error if it already exists.
            conn.execute(text("ALTER TABLE users ADD COLUMN pfp_key VARCHAR"))
    except Exception:
        # If the column already exists or the DB doesn't support this exact syntax,
        # just ignore the error – we only need it to succeed once.
        pass


app.include_router(auth.router)
app.include_router(quests.router)
app.include_router(friends.router)
app.include_router(share.router)
app.include_router(posts.router)
app.include_router(users.router)

