from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
import os

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            creds.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload["sub"]
    except:
        raise HTTPException(status_code=401)


SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Optional application-wide salt (pepper) for passwords.
# This is in addition to bcrypt's built-in per-password salt.
PASSWORD_SALT = os.getenv("PASSWORD_SALT", "")


def _with_salt(password: str) -> str:
    """
    Combine the configured application-wide salt with the raw password.
    """
    return f"{PASSWORD_SALT}{password}"


def hash_password(password: str) -> str:
    # New scheme: hash salted password (salt + password)
    return pwd_context.hash(_with_salt(password))


def verify_password(password: str, hashed: str) -> bool:
    # First try verifying with salted password (new scheme)
    try:
        if pwd_context.verify(_with_salt(password), hashed):
            return True
    except Exception:
        # If verification fails due to scheme/format issues, fall through to legacy check.
        pass

    # Fallback: verify legacy hashes that were created without the additional salt.
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_token(user_id: str):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
