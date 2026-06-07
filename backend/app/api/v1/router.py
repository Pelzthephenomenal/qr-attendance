from fastapi import APIRouter

from app.api.v1 import analytics, attendance, auth, courses, departments, enrollments, notifications, reports, schedules, sessions, users


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(departments.router, tags=["departments"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(enrollments.router, tags=["enrollments"])
api_router.include_router(sessions.router, tags=["sessions"])
api_router.include_router(attendance.router, tags=["attendance"])
api_router.include_router(schedules.router, tags=["schedules"])
api_router.include_router(notifications.router, tags=["notifications"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(reports.router, tags=["reports"])
