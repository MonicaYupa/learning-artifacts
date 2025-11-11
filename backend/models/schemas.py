"""
Pydantic Models for API Validation
Request and response schemas for all endpoints
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# Enums
class SkillLevel(str, Enum):
    """Skill level for learning modules"""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class SessionStatus(str, Enum):
    """Session completion status"""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ExerciseType(str, Enum):
    """Exercise type"""

    ANALYSIS = "analysis"
    COMPARATIVE = "comparative"
    FRAMEWORK = "framework"


class Assessment(str, Enum):
    """Answer assessment level"""

    STRONG = "strong"
    DEVELOPING = "developing"
    NEEDS_SUPPORT = "needs_support"


# User Models
class UserResponse(BaseModel):
    """User response model"""

    id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


# Module Models
class ExerciseSchema(BaseModel):
    """Exercise schema embedded in modules"""

    sequence: int
    type: ExerciseType
    prompt: str
    material: Optional[str] = None
    options: Optional[List[str]] = None
    scaffold: Optional[Dict[str, str]] = None
    hints: List[str] = Field(..., min_length=3, max_length=3)
    validation_criteria: Dict[str, str]
    model_answer: str
    model_explanation: str
    estimated_minutes: int


class ModuleGenerateRequest(BaseModel):
    """Request to generate a new module"""

    message: Optional[str] = Field(None, min_length=1, max_length=500)
    topic: Optional[str] = Field(None, min_length=1, max_length=200)
    skill_level: Optional[SkillLevel] = None
    exercise_count: int = Field(default=3, ge=1, le=5)


class ModuleResponse(BaseModel):
    """Module response model"""

    id: str
    title: str
    domain: str
    skill_level: SkillLevel
    exercises: List[ExerciseSchema]
    created_at: datetime

    class Config:
        from_attributes = True


class ModuleListItem(BaseModel):
    """Module list item (without exercises)"""

    id: str
    title: str
    domain: str
    skill_level: SkillLevel
    exercise_count: int
    estimated_minutes: int
    created_at: datetime


# Session Models
class SessionCreateRequest(BaseModel):
    """Request to create a new session"""

    module_id: str


class SessionUpdateRequest(BaseModel):
    """Request to update session"""

    current_exercise_index: Optional[int] = None
    status: Optional[SessionStatus] = None
    confidence_rating: Optional[int] = Field(None, ge=1, le=5)


class AttemptSchema(BaseModel):
    """Attempt schema embedded in sessions"""

    exercise_index: int
    attempt_number: int
    answer_text: str
    time_spent_seconds: int
    hints_used: int
    assessment: Assessment
    internal_score: int = Field(..., ge=0, le=100)
    feedback: str
    should_advance: bool
    created_at: datetime


class SessionResponse(BaseModel):
    """Session response model"""

    id: str
    user_id: str
    module_id: str
    current_exercise_index: int
    attempts: List[AttemptSchema]
    status: SessionStatus
    confidence_rating: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnswerSubmitRequest(BaseModel):
    """Request to submit an answer"""

    answer_text: str = Field(..., min_length=10)
    time_spent_seconds: int = Field(..., ge=0)
    hints_used: int = Field(..., ge=0, le=3)


class AnswerSubmitResponse(BaseModel):
    """Response from answer submission"""

    assessment: Assessment
    internal_score: int
    feedback: str
    should_advance: bool
    attempt_number: int
    hint_available: bool
    model_answer_available: bool


class HintRequest(BaseModel):
    """Request for a hint"""

    hint_level: Optional[int] = Field(None, ge=1, le=3)


class HintResponse(BaseModel):
    """Response with hint"""

    hint_level: int
    hint_text: str
    hints_remaining: int


# Health Check
class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    database: str
    timestamp: datetime


# Error Response
class ErrorResponse(BaseModel):
    """Standard error response"""

    error: str
    message: str
    retry_after: Optional[int] = None
