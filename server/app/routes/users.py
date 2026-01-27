import os
import uuid

import boto3
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import User
from ..security import get_current_user_id


router = APIRouter(prefix="/users")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def _signed_pfp_url(key: str | None) -> str | None:
    if not key:
        return None
    r2_bucket = os.getenv("R2_PFP_BUCKET")
    if not r2_bucket:
        raise HTTPException(status_code=500, detail="R2_PFP_BUCKET not configured on server")

    expires = int(os.getenv("R2_PFP_SIGNED_URL_EXPIRES_SECONDS", "3600"))
    s3 = _get_s3_client()
    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": r2_bucket, "Key": key},
            ExpiresIn=expires,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to sign pfp URL: {e}")


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "pfp_url": _signed_pfp_url(user.pfp_key),
    }


@router.post("/me/pfp")
async def upload_pfp(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    r2_bucket = os.getenv("R2_PFP_BUCKET")
    if not r2_bucket:
        raise HTTPException(status_code=500, detail="R2_PFP_BUCKET not configured on server")

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Profile picture must be an image")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    s3 = _get_s3_client()

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.split(".")[-1].lower()
    key = f"pfp/{user_id}/{uuid.uuid4().hex}{ext}"

    try:
        s3.put_object(
            Bucket=r2_bucket,
            Key=key,
            Body=raw,
            ContentType=content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"R2 pfp upload failed: {e}")

    user.pfp_key = key
    db.commit()

    url = _signed_pfp_url(key)
    return {"pfp_url": url}


@router.get("/by-username/{username}")
def get_user_by_username(
    username: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),  # noqa: ARG001 - ensure auth
):
    """
    Fetch a user's public profile info (id, username, pfp URL) by username.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "pfp_url": _signed_pfp_url(user.pfp_key),
    }

