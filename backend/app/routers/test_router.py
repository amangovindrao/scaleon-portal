from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import random

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/test", tags=["test"])

# Time limit per section, in seconds. Tune freely.
SECTION_TIME_LIMITS = {
    models.Section.aptitude: 60 * 60,  # 60 minutes
    models.Section.coding: 30 * 60,
    models.Section.case_study: 25 * 60,
}

SECTION_ORDER = [models.Section.aptitude, models.Section.coding, models.Section.case_study]


@router.post("/start", response_model=schemas.SessionOut)
def start_test(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    existing = (
        db.query(models.TestSession)
        .filter(models.TestSession.candidate_id == candidate.id)
        .order_by(models.TestSession.id.desc())
        .first()
    )
    if existing and existing.status in (
        models.SessionStatus.submitted,
        models.SessionStatus.auto_submitted_warnings,
        models.SessionStatus.expired,
    ):
        raise HTTPException(status_code=400, detail="You have already completed this test.")
    if existing and existing.status == models.SessionStatus.in_progress:
        return existing  # resume, don't create a duplicate

    session = models.TestSession(
        candidate_id=candidate.id,
        status=models.SessionStatus.in_progress,
        current_section=models.Section.aptitude,
        started_at=datetime.utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _get_active_session(db: Session, candidate: models.Candidate) -> models.TestSession:
    session = (
        db.query(models.TestSession)
        .filter(
            models.TestSession.candidate_id == candidate.id,
            models.TestSession.status == models.SessionStatus.in_progress,
        )
        .order_by(models.TestSession.id.desc())
        .first()
    )
    if not session:
        raise HTTPException(status_code=400, detail="No active test session. Start the test first.")
    return session


@router.get("/section/{section}", response_model=schemas.SectionPayload)
def get_section_questions(
    section: models.Section,
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    session = _get_active_session(db, candidate)
    questions = (
        db.query(models.Question)
        .filter(
            models.Question.role_id == candidate.role_id,
            models.Question.section == section,
        )
        .order_by(models.Question.order_index)
        .all()
    )
    # Shuffle questions uniquely per candidate (deterministic based on candidate ID)
    rng = random.Random(candidate.id)
    rng.shuffle(questions)

    return schemas.SectionPayload(
        section=section,
        questions=questions,
        time_limit_seconds=SECTION_TIME_LIMITS[section],
    )


@router.post("/answer")
def submit_answer(
    payload: schemas.SubmitAnswer,
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    session = _get_active_session(db, candidate)
    question = db.query(models.Question).filter(models.Question.id == payload.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = payload.selected_option == question.correct_option

    existing_answer = (
        db.query(models.Answer)
        .filter(models.Answer.session_id == session.id, models.Answer.question_id == question.id)
        .first()
    )
    if existing_answer:
        existing_answer.selected_option = payload.selected_option
        existing_answer.is_correct = is_correct
    else:
        db.add(models.Answer(
            session_id=session.id,
            question_id=question.id,
            selected_option=payload.selected_option,
            is_correct=is_correct,
        ))
    db.commit()
    return {"detail": "Answer saved"}


@router.post("/advance-section", response_model=schemas.SessionOut)
def advance_section(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    """Move from current section to the next, or finish the test entirely."""
    session = _get_active_session(db, candidate)
    idx = SECTION_ORDER.index(session.current_section)
    if idx + 1 < len(SECTION_ORDER):
        session.current_section = SECTION_ORDER[idx + 1]
        db.commit()
        db.refresh(session)
        return session
    else:
        _finalize_session(db, session, models.SessionStatus.submitted)
        db.refresh(session)
        return session


def _finalize_session(db: Session, session: models.TestSession, status: models.SessionStatus):
    answers = db.query(models.Answer).filter(models.Answer.session_id == session.id).all()
    score_by_section = {s: 0.0 for s in SECTION_ORDER}
    max_by_section = {s: 0.0 for s in SECTION_ORDER}

    all_questions = {
        q.id: q for q in db.query(models.Question).filter(
            models.Question.role_id == session.candidate.role_id
        ).all()
    }
    for q in all_questions.values():
        max_by_section[q.section] += q.points

    for a in answers:
        q = all_questions.get(a.question_id)
        if q and a.is_correct:
            score_by_section[q.section] += q.points

    session.score_aptitude = score_by_section[models.Section.aptitude]
    session.score_coding = score_by_section[models.Section.coding]
    session.score_case_study = score_by_section[models.Section.case_study]
    session.total_score = sum(score_by_section.values())
    session.max_score = sum(max_by_section.values())
    session.status = status
    session.submitted_at = datetime.utcnow()
    db.commit()


@router.post("/finish", response_model=schemas.ResultOut)
def finish_test(
    db: Session = Depends(get_db),
    candidate: models.Candidate = Depends(auth.get_current_candidate),
):
    session = _get_active_session(db, candidate)
    _finalize_session(db, session, models.SessionStatus.submitted)
    db.refresh(session)
    return schemas.ResultOut(
        session_id=session.id,
        status=session.status,
        score_aptitude=session.score_aptitude,
        score_coding=session.score_coding,
        score_case_study=session.score_case_study,
        total_score=session.total_score,
        max_score=session.max_score,
        warning_count=session.warning_count,
    )
