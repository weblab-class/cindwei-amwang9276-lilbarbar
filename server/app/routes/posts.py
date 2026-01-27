import os
import uuid

import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Post, Quest, PostComment, User, PostVote
from ..schemas import PostCreate, PostOut, CommentCreate, CommentOut
from ..security import get_current_user_id


router = APIRouter(prefix="/posts")

def _get_s3_client():
    r2_account_id = os.getenv("R2_ACCOUNT_ID")
    r2_access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    r2_secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
    if not (r2_account_id and r2_access_key_id and r2_secret_access_key):
        raise HTTPException(status_code=500, detail="R2 credentials not configured on server")

    endpoint_url = f"https://{r2_account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=r2_access_key_id,
        aws_secret_access_key=r2_secret_access_key,
        region_name="auto",
    )


def _signed_get_url(key: str) -> str:
    """
    Sign a GET URL for a private R2 object key.
    """
    r2_bucket = os.getenv("R2_BUCKET")
    if not r2_bucket:
        raise HTTPException(status_code=500, detail="R2 bucket not configured on server")

    expires = int(os.getenv("R2_SIGNED_URL_EXPIRES_SECONDS", "3600"))
    s3 = _get_s3_client()
    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": r2_bucket, "Key": key},
            ExpiresIn=expires,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to sign URL: {e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=list[PostOut])
def list_posts(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - ensure auth
):
    """
    Return all posts with attached quest metadata.
    Frontend is responsible for selecting top / random subsets.
    """
    posts = db.query(Post).order_by(Post.created_at.desc()).all()

    # Load this user's votes for the returned posts in one query
    post_ids = [p.id for p in posts]
    vote_map: dict[str, int] = {}
    if post_ids:
        votes = (
            db.query(PostVote)
            .filter(PostVote.user_id == user_id, PostVote.post_id.in_(post_ids))
            .all()
        )
        vote_map = {v.post_id: int(v.value) for v in votes}

    results: list[PostOut] = []
    for p in posts:
        quest = db.get(Quest, p.quest_id)
        # For private R2, we store the object key in Post.media_url and return a signed URL here.
        signed_url = _signed_get_url(p.media_url)
        results.append(
            PostOut(
                id=p.id,
                quest_id=p.quest_id,
                media_url=signed_url,
                media_type=p.media_type,
                votes=p.votes,
                quest_title=quest.title if quest else None,
                quest_icon=quest.icon if quest else None,
                my_vote=vote_map.get(p.id, 0),
            )
        )
    return results


@router.post("/", response_model=PostOut)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Create a new post after media has been uploaded to Cloudflare.
    """
    quest = db.get(Quest, data.quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    post = Post(
        quest_id=data.quest_id,
        user_id=user_id,
        media_url=data.media_url,
        media_type=data.media_type,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # If client uses this route directly, assume media_url is a key for private R2.
    signed_url = _signed_get_url(post.media_url)
    return PostOut(
        id=post.id,
        quest_id=post.quest_id,
        media_url=signed_url,
        media_type=post.media_type,
        votes=post.votes,
        quest_title=quest.title,
        quest_icon=quest.icon,
        my_vote=0,
    )


@router.post("/upload", response_model=PostOut)
async def upload_post(
    quest_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Browser uploads file to OUR backend (avoids Cloudflare CORS), then backend uploads to Cloudflare R2 (S3 API).

    Env vars required (private R2 + signed URLs):
    - R2_ACCOUNT_ID
    - R2_ACCESS_KEY_ID
    - R2_SECRET_ACCESS_KEY
    - R2_BUCKET
    - R2_SIGNED_URL_EXPIRES_SECONDS (optional, default 3600)
    """
    quest = db.get(Quest, quest_id)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")

    r2_bucket = os.getenv("R2_BUCKET")
    if not r2_bucket:
        raise HTTPException(status_code=500, detail="R2 bucket not configured on server")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "application/octet-stream"
    lower_ct = content_type.lower()
    media_type = "video" if lower_ct.startswith("video/") else "image"

    # Upload to R2 (S3-compatible)
    s3 = _get_s3_client()

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.split(".")[-1].lower()
    key = f"posts/{quest_id}/{uuid.uuid4().hex}{ext}"

    try:
        s3.put_object(
            Bucket=r2_bucket,
            Key=key,
            Body=raw,
            ContentType=content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"R2 upload failed: {e}")

    post = Post(
        quest_id=quest_id,
        user_id=user_id,
        # Store the R2 object key; serve signed URLs to clients.
        media_url=key,
        media_type=media_type,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    signed_url = _signed_get_url(key)
    return PostOut(
        id=post.id,
        quest_id=post.quest_id,
        media_url=signed_url,
        media_type=post.media_type,
        votes=post.votes,
        quest_title=quest.title,
        quest_icon=quest.icon,
        my_vote=0,
    )


@router.post("/{post_id}/vote", response_model=PostOut)
def vote_post(
    post_id: str,
    delta: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - ensure auth
):
    """
    Upvote/downvote a post.
    """
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Persist per-user vote state so it survives refresh/logout.
    existing = (
        db.query(PostVote)
        .filter(PostVote.post_id == post_id, PostVote.user_id == user_id)
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
            db.add(PostVote(post_id=post_id, user_id=user_id, value=next_value))

    post.votes += delta
    db.commit()
    db.refresh(post)

    quest = db.get(Quest, post.quest_id)
    signed_url = _signed_get_url(post.media_url)
    return PostOut(
        id=post.id,
        quest_id=post.quest_id,
        media_url=signed_url,
        media_type=post.media_type,
        votes=post.votes,
        quest_title=quest.title if quest else None,
        quest_icon=quest.icon if quest else None,
        my_vote=next_value,
    )


@router.get("/{post_id}/comments", response_model=list[CommentOut])
def list_comments(
    post_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - ensure auth
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = (
        db.query(PostComment)
        .filter(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .all()
    )

    results: list[CommentOut] = []
    for c in comments:
        user = db.get(User, c.user_id)
        results.append(
            CommentOut(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                username=user.username if user else None,
                content=c.content,
                created_at=c.created_at.isoformat() if c.created_at else None,
            )
        )
    return results


@router.post("/{post_id}/comments", response_model=CommentOut)
def create_comment(
    post_id: str,
    data: CommentCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment = PostComment(
        post_id=post_id,
        user_id=user_id,
        content=data.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    user = db.get(User, user_id)
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        username=user.username if user else None,
        content=comment.content,
        created_at=comment.created_at.isoformat() if comment.created_at else None,
    )

