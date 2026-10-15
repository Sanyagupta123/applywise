"""ApplyWise API."""

from contextlib import asynccontextmanager
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .analyzer import analyze_job_description
from .database import get_connection, initialize_database


class ApplicationStatus(str, Enum):
    SAVED = "Saved"
    APPLIED = "Applied"
    ASSESSMENT = "Assessment"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"


class ApplicationCreate(BaseModel):
    company: Annotated[str, Field(min_length=1, max_length=120)]
    role: Annotated[str, Field(min_length=1, max_length=160)]
    job_url: Annotated[str | None, Field(max_length=2048)] = None
    status: ApplicationStatus = ApplicationStatus.SAVED
    deadline: date | None = None

    @field_validator("company", "role")
    @classmethod
    def require_non_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty or whitespace.")
        return cleaned

    @field_validator("job_url")
    @classmethod
    def normalize_job_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    role: str
    job_url: str | None
    status: ApplicationStatus
    deadline: date | None
    created_at: datetime


class JobDescriptionRequest(BaseModel):
    job_description: Annotated[str, Field(min_length=1, max_length=30000)]

    @field_validator("job_description")
    @classmethod
    def require_non_whitespace(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Job description cannot be empty or whitespace.")
        return cleaned


class SkillAnalysisResponse(BaseModel):
    matched_skills: list[str]
    missing_skills: list[str]
    match_percentage: int


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="ApplyWise API",
    description="Internship application tracking and job skill analysis.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ApplyWise API"}


@app.post(
    "/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_application(payload: ApplicationCreate) -> ApplicationResponse:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO applications (company, role, job_url, status, deadline)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                payload.company,
                payload.role,
                payload.job_url,
                payload.status.value,
                payload.deadline.isoformat() if payload.deadline else None,
            ),
        )
        row = connection.execute(
            "SELECT * FROM applications WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
        connection.commit()
    return ApplicationResponse.model_validate(dict(row))


@app.get("/applications", response_model=list[ApplicationResponse])
def list_applications() -> list[ApplicationResponse]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM applications ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return [ApplicationResponse.model_validate(dict(row)) for row in rows]


@app.patch(
    "/applications/{application_id}/status",
    response_model=ApplicationResponse,
)
def update_application_status(
    payload: ApplicationStatusUpdate,
    application_id: Annotated[int, Path(gt=0)],
) -> ApplicationResponse:
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE applications SET status = ? WHERE id = ?",
            (payload.status.value, application_id),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )
        row = connection.execute(
            "SELECT * FROM applications WHERE id = ?",
            (application_id,),
        ).fetchone()
        connection.commit()
    return ApplicationResponse.model_validate(dict(row))


@app.delete(
    "/applications/{application_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_application(
    application_id: Annotated[int, Path(gt=0)],
) -> None:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM applications WHERE id = ?",
            (application_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Application not found.",
            )
        connection.commit()


@app.post("/analyze", response_model=SkillAnalysisResponse)
def analyze_description(
    payload: JobDescriptionRequest,
) -> SkillAnalysisResponse:
    return SkillAnalysisResponse.model_validate(
        analyze_job_description(payload.job_description)
    )
