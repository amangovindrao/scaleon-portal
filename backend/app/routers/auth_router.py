from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/admin/login", response_model=schemas.TokenResponse)
def admin_login(payload: schemas.AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(models.Admin).filter(models.Admin.email == payload.email).first()
    if not admin or not auth.verify_password(payload.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = auth.create_access_token(admin.id, "admin")
    return schemas.TokenResponse(access_token=token, role="admin")


@router.post("/candidate/login", response_model=schemas.TokenResponse)
def candidate_login(payload: schemas.CandidateLogin, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(
        models.Candidate.email == payload.email
    ).first()
    if not candidate or candidate.access_code != payload.access_code:
        raise HTTPException(status_code=401, detail="Incorrect email or access code")
    token = auth.create_access_token(candidate.id, "candidate")
    return schemas.TokenResponse(access_token=token, role="candidate")


@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    return {"name": candidate.name, "email": candidate.email}
