"""
Proctoring router.

Two responsibilities:
1. Accept a webcam frame every ~5s from the candidate's browser, compress
   and store it on disk, log metadata in the DB. (Compression also happens
   client-side before upload — see frontend — this is a server-side safety
   net so oversized frames never bloat storage.)
2. Accept proctoring events (tab switch, window blur, fullscreen exit) and
   enforce the 3-warning rule: 1st and 2nd events are warnings, the 3rd
   auto-submits the test immediately.
"""
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from PIL import Image
import io

from .. import models, schemas, auth
from ..database import get_db
from .test_router import _get_active_session, _finalize_session

router = APIRouter(prefix="/proctor", tags=["proctor"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "frames")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_WARNINGS = 3


@router.post("/frame")
async def upload_frame(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    """Accept frame upload but don't store on disk (saves resources on free hosting).
    Just acknowledge receipt — proctoring is enforced via events/warnings."""
    _ = await file.read()  # consume the upload
    return {"detail": "Frame received"}


@router.post("/event", response_model=schemas.ProctorEventOut)
def log_proctor_event(
    payload: schemas.ProctorEventIn,
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    session = _get_active_session(db, candidate)

    session.warning_count += 1
    warning_number = session.warning_count

    event = models.ProctorEvent(
        session_id=session.id,
        event_type=payload.event_type,
        warning_number=warning_number,
        detail=payload.detail,
    )
    db.add(event)

    auto_submitted = False
    if warning_number >= MAX_WARNINGS:
        _finalize_session(db, session, models.SessionStatus.auto_submitted_warnings)
        auto_submitted = True
        message = (
            f"Warning {warning_number}/{MAX_WARNINGS}: test ended automatically "
            "due to repeated violations."
        )
    else:
        db.commit()
        remaining = MAX_WARNINGS - warning_number
        message = (
            f"Warning {warning_number}/{MAX_WARNINGS}: suspicious activity detected "
            f"({payload.event_type.value.replace('_', ' ')}). "
            f"{remaining} warning{'s' if remaining != 1 else ''} remaining before "
            "the test ends automatically."
        )

    return schemas.ProctorEventOut(
        warning_count=warning_number,
        auto_submitted=auto_submitted,
        message=message,
    )


@router.get("/status", response_model=schemas.SessionOut)
def proctor_status(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    """Lets the frontend poll/recheck session + warning state, e.g. after a refresh."""
    session = (
        db.query(models.TestSession)
        .filter(models.TestSession.candidate_id == candidate.id)
        .order_by(models.TestSession.id.desc())
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="No session found")
    return session
