import enum


class UserRole(str, enum.Enum):
    """User role enum for authorization."""
    student = "student"
    lecturer = "lecturer"
    admin = "admin"
    staff = "staff"


class SessionStatus(str, enum.Enum):
    """Attendance session status."""
    draft = "draft"
    scheduled = "scheduled"
    active = "active"
    closed = "closed"
    cancelled = "cancelled"


class AttendanceStatus(str, enum.Enum):
    """Student attendance status for a session."""
    present = "present"
    late = "late"
    absent = "absent"
    excused = "excused"
    manual_present = "manual_present"


class ScanResult(str, enum.Enum):
    """QR code scan result."""
    accepted = "accepted"
    duplicate = "duplicate"
    expired_token = "expired_token"
    invalid_token = "invalid_token"
    not_enrolled = "not_enrolled"
    session_inactive = "session_inactive"
    outside_location = "outside_location"
    device_rejected = "device_rejected"
    error = "error"
