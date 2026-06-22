from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import RoleSlug, Section, SessionStatus, ProctorEventType


# ---------- Auth ----------

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class CandidateLogin(BaseModel):
    email: EmailStr
    access_code: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # "admin" | "candidate"


# ---------- Roles ----------

class RoleOut(BaseModel):
    id: int
    slug: RoleSlug
    name: str
    description: str
    class Config:
        from_attributes = True


# ---------- Candidates (admin-facing) ----------

class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    access_code: str
    role_id: int

class CandidateOut(BaseModel):
    id: int
    name: str
    email: str
    role_id: int
    class Config:
        from_attributes = True

class CandidateWithResult(CandidateOut):
    access_code: Optional[str] = None
    role_name: Optional[str] = None
    session_status: Optional[str] = None
    total_score: Optional[float] = None
    max_score: Optional[float] = None
    warning_count: Optional[int] = None
    session_id: Optional[int] = None


# ---------- Questions (admin-facing) ----------

class QuestionCreate(BaseModel):
    role_id: int
    section: Section
    prompt: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    points: int = 1
    order_index: int = 0

class QuestionOut(BaseModel):
    id: int
    role_id: int
    section: Section
    prompt: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    points: int
    order_index: int
    class Config:
        from_attributes = True

# What the candidate actually receives — no correct_option leaked
class QuestionForCandidate(BaseModel):
    id: int
    section: Section
    prompt: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    points: int
    class Config:
        from_attributes = True


# ---------- Test session (candidate-facing) ----------

class SessionOut(BaseModel):
    id: int
    status: SessionStatus
    current_section: Section
    started_at: Optional[datetime]
    warning_count: int
    class Config:
        from_attributes = True

class SubmitAnswer(BaseModel):
    question_id: int
    selected_option: str  # "a" | "b" | "c" | "d"

class SectionPayload(BaseModel):
    section: Section
    questions: List[QuestionForCandidate]
    time_limit_seconds: int

class ResultOut(BaseModel):
    session_id: int
    status: SessionStatus
    score_aptitude: float
    score_coding: float
    score_case_study: float
    total_score: float
    max_score: float
    warning_count: int


# ---------- Proctoring ----------

class ProctorEventIn(BaseModel):
    event_type: ProctorEventType
    detail: str = ""

class ProctorEventOut(BaseModel):
    warning_count: int
    auto_submitted: bool
    message: str

class ProctorEventLog(BaseModel):
    id: int
    event_type: ProctorEventType
    warning_number: int
    detail: str
    created_at: datetime
    class Config:
        from_attributes = True

class CameraFrameOut(BaseModel):
    id: int
    captured_at: datetime
    file_path: str
    class Config:
        from_attributes = True


# ---------- Session Detail (admin-facing) ----------

class AnswerDetailOut(BaseModel):
    question_id: int
    question_prompt: str
    selected_option: Optional[str]
    correct_option: str
    is_correct: bool
    answered_at: Optional[datetime]

class ProctorEventDetailOut(BaseModel):
    event_type: ProctorEventType
    detail: str
    warning_number: int
    created_at: datetime

class SessionDetailOut(BaseModel):
    id: int
    status: SessionStatus
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    warning_count: int
    score_aptitude: float
    score_coding: float
    score_case_study: float
    total_score: float
    max_score: float
    candidate_name: str
    candidate_email: str
    role_name: str
    answers: List[AnswerDetailOut]
    proctor_events: List[ProctorEventDetailOut]
