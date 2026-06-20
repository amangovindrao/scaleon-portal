"""
Auth utilities.

Two kinds of logins share the same JWT mechanism but carry a `role` claim
("admin" or "candidate") plus a `sub` (subject id). Routers check the role
claim to gate access — admin endpoints reject candidate tokens and vice versa.

NOTE: SECRET_KEY below is a local-dev placeholder. Before deploying for
real, move it to an environment variable and never commit the real value.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from . import models

SECRET_KEY = "scaleon-local-dev-secret-change-before-deploy"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 6

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/admin/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: int, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(subject), "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_admin(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Admin:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    admin = db.query(models.Admin).filter(models.Admin.id == int(payload["sub"])).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin


def get_current_candidate(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Candidate:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if payload.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access required")
    candidate = db.query(models.Candidate).filter(
        models.Candidate.id == int(payload["sub"])
    ).first()
    if not candidate:
        raise HTTPException(status_code=401, detail="Candidate not found")
    return candidate
