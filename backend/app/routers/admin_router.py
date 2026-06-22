from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- Roles ----------

@router.get("/roles", response_model=List[schemas.RoleOut])
def list_roles(db: Session = Depends(get_db), _admin=Depends(auth.get_current_admin)):
    return db.query(models.Role).all()


# ---------- Candidates ----------

@router.post("/candidates", response_model=schemas.CandidateOut)
def create_candidate(
    payload: schemas.CandidateCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    existing = db.query(models.Candidate).filter(models.Candidate.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A candidate with this email already exists")
    role = db.query(models.Role).filter(models.Role.id == payload.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    candidate = models.Candidate(
        name=payload.name,
        email=payload.email,
        access_code=payload.access_code,
        role_id=payload.role_id,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/candidates", response_model=List[schemas.CandidateWithResult])
def list_candidates(db: Session = Depends(get_db), _admin=Depends(auth.get_current_admin)):
    candidates = db.query(models.Candidate).all()
    results = []
    for c in candidates:
        latest_session = (
            db.query(models.TestSession)
            .filter(models.TestSession.candidate_id == c.id)
            .order_by(models.TestSession.id.desc())
            .first()
        )
        results.append(schemas.CandidateWithResult(
            id=c.id,
            name=c.name,
            email=c.email,
            role_id=c.role_id,
            role_name=c.role.name if c.role else None,
            session_status=latest_session.status.value if latest_session else None,
            total_score=latest_session.total_score if latest_session else None,
            max_score=latest_session.max_score if latest_session else None,
            warning_count=latest_session.warning_count if latest_session else None,
            session_id=latest_session.id if latest_session else None,
        ))
    return results


@router.delete("/candidates/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return {"detail": "Candidate removed"}


# ---------- Questions ----------

@router.post("/questions", response_model=schemas.QuestionOut)
def create_question(
    payload: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    if payload.correct_option not in ("a", "b", "c", "d"):
        raise HTTPException(status_code=400, detail="correct_option must be a, b, c, or d")
    question = models.Question(**payload.dict())
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.get("/questions", response_model=List[schemas.QuestionOut])
def list_questions(
    role_id: int = None,
    section: str = None,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    q = db.query(models.Question)
    if role_id:
        q = q.filter(models.Question.role_id == role_id)
    if section:
        q = q.filter(models.Question.section == section)
    return q.order_by(models.Question.order_index).all()


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return {"detail": "Question removed"}


# ---------- Results & proctoring review ----------

@router.get("/sessions/{session_id}", response_model=schemas.SessionDetailOut)
def get_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    session = db.query(models.TestSession).filter(models.TestSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    candidate = session.candidate
    role_name = candidate.role.name if candidate.role else "Unknown"

    # Build answers list with question details
    answers_out = []
    for ans in session.answers:
        question = ans.question
        answers_out.append(schemas.AnswerDetailOut(
            question_id=ans.question_id,
            question_prompt=question.prompt if question else "Deleted question",
            selected_option=ans.selected_option,
            correct_option=question.correct_option if question else "",
            is_correct=ans.is_correct,
            answered_at=ans.answered_at,
        ))

    # Build proctor events list
    proctor_events_out = [
        schemas.ProctorEventDetailOut(
            event_type=ev.event_type,
            detail=ev.detail or "",
            warning_number=ev.warning_number,
            created_at=ev.created_at,
        )
        for ev in session.proctor_events
    ]

    return schemas.SessionDetailOut(
        id=session.id,
        status=session.status,
        started_at=session.started_at,
        submitted_at=session.submitted_at,
        warning_count=session.warning_count,
        score_aptitude=session.score_aptitude,
        score_coding=session.score_coding,
        score_case_study=session.score_case_study,
        total_score=session.total_score,
        max_score=session.max_score,
        candidate_name=candidate.name,
        candidate_email=candidate.email,
        role_name=role_name,
        answers=answers_out,
        proctor_events=proctor_events_out,
    )


@router.get("/sessions/{session_id}/proctor-events", response_model=List[schemas.ProctorEventLog])
def get_proctor_events(
    session_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    return (
        db.query(models.ProctorEvent)
        .filter(models.ProctorEvent.session_id == session_id)
        .order_by(models.ProctorEvent.created_at)
        .all()
    )


@router.get("/sessions/{session_id}/frames", response_model=List[schemas.CameraFrameOut])
def get_camera_frames(
    session_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    return (
        db.query(models.CameraFrame)
        .filter(models.CameraFrame.session_id == session_id)
        .order_by(models.CameraFrame.captured_at)
        .all()
    )


# ---------- CSV Export ----------

@router.get("/export/csv")
def export_candidates_csv(
    db: Session = Depends(get_db),
    _admin=Depends(auth.get_current_admin),
):
    """Download all candidate data as CSV."""
    candidates = db.query(models.Candidate).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Role", "Status", "Score", "Max Score", "Warnings", "Started At", "Submitted At"])

    for c in candidates:
        session = (
            db.query(models.TestSession)
            .filter(models.TestSession.candidate_id == c.id)
            .order_by(models.TestSession.id.desc())
            .first()
        )
        writer.writerow([
            c.name,
            c.email,
            c.role.name if c.role else "",
            session.status.value if session else "not_started",
            session.total_score if session else 0,
            session.max_score if session else 0,
            session.warning_count if session else 0,
            session.started_at.isoformat() if session and session.started_at else "",
            session.submitted_at.isoformat() if session and session.submitted_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=scaleon_candidates.csv"},
    )
