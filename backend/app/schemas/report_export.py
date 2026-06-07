"""
Pydantic schemas for report export.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ReportExportFilters(BaseModel):
    """Query parameters / filters for attendance export."""
    course_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    date_from: Optional[str] = None   # ISO date string YYYY-MM-DD
    date_to: Optional[str] = None     # ISO date string YYYY-MM-DD


class ReportExportPublic(BaseModel):
    """Response body when a report export record is created."""
    id: UUID
    organization_id: UUID
    requested_by: UUID
    report_type: str
    status: str
    file_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
