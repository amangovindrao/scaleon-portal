"""
Database models.

Core entities:
- Admin: theScaleOn staff who log in to manage candidates/questions/results.
- Candidate: a student being evaluated. Pre-created by an admin (per your
  chosen flow — no self-registration). Logs in with email + access code.
- Role: the job role being hired for (AI Agent Developer, Project Management,
  Social Media Marketing). Each role has its own question sets.
- Question: belongs to a Role and a Section (aptitude / coding / case_study).
  All question types are MCQ-style (single correct option) per your spec —
  no live code execution needed.
- TestSession: one candidate's attempt at the full test (all 3 sections).
  Tracks status, timing, warning count, and final score.
- Answer: one submitted answer to one question within a session.
- ProctorEvent: a logged proctoring incident — tab switch, window blur,
  no-face-detected, etc. Tied to a session. This is what powers the
  3-warning system.
- CameraFrame: metadata + file path for each snapshot captured during a
  session (every 5s while the test is active). Actual JPEG bytes are
  stored on disk, not in the DB — keeps the database small and fast.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Enum
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class RoleSlug(str, enum.Enum):
    technical = "technical"
    marketing = "marketing"


class Section(str, enum.Enum):
    aptitude = "aptitude"
    coding = "coding"
    case_study = "case_study"


class SessionStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    submitted = "submitted"
    auto_submitted_warnings = "auto_submitted_warnings"  # killed by 3 warnings
    expired = "expired"  # ran out of time


class ProctorEventType(str, enum.Enum):
    tab_switch = "tab_switch"
    window_blur = "window_blur"
    fullscreen_exit = "fullscreen_exit"
    no_face = "no_face"
    multiple_faces = "multiple_faces"
    camera_blocked = "camera_blocked"


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    slug = Column(Enum(RoleSlug), unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")

    questions = relationship("Question", back_populates="role")
    candidates = relationship("Candidate", back_populates="role")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    access_code = Column(String, nullable=False)  # simple shared-secret login, set by admin
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    role = relationship("Role", back_populates="candidates")
    sessions = relationship("TestSession", back_populates="candidate")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    section = Column(Enum(Section), nullable=False)
    prompt = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_option = Column(String, nullable=False)  # "a" | "b" | "c" | "d"
    points = Column(Integer, default=1)
    order_index = Column(Integer, default=0)

    role = relationship("Role", back_populates="questions")


class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.not_started)
    current_section = Column(Enum(Section), default=Section.aptitude)

    started_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, nullable=True)

    warning_count = Column(Integer, default=0)
    score_aptitude = Column(Float, default=0)
    score_coding = Column(Float, default=0)
    score_case_study = Column(Float, default=0)
    total_score = Column(Float, default=0)
    max_score = Column(Float, default=0)

    candidate = relationship("Candidate", back_populates="sessions")
    answers = relationship("Answer", back_populates="session")
    proctor_events = relationship("ProctorEvent", back_populates="session")
    camera_frames = relationship("CameraFrame", back_populates="session")


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option = Column(String, nullable=True)  # "a" | "b" | "c" | "d"
    is_correct = Column(Boolean, default=False)
    answered_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TestSession", back_populates="answers")
    question = relationship("Question")


class ProctorEvent(Base):
    __tablename__ = "proctor_events"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    event_type = Column(Enum(ProctorEventType), nullable=False)
    warning_number = Column(Integer, nullable=False)  # 1, 2, or 3 at time of event
    detail = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("TestSession", back_populates="proctor_events")


class CameraFrame(Base):
    __tablename__ = "camera_frames"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    file_path = Column(String, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow)
    flagged = Column(Boolean, default=False)  # reserved for future face-detection-on-frame

    session = relationship("TestSession", back_populates="camera_frames")
