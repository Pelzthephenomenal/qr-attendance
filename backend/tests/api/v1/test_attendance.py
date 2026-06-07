from datetime import datetime, timedelta, timezone
import json
import hashlib
import uuid
from app.models.enums import SessionStatus, AttendanceStatus, ScanResult
from app.models.course import Course, CourseInstructor
from app.models.enrollment import Enrollment
from app.models.attendance_session import AttendanceSession
from app.models.qr_token import QRToken
from app.models.attendance_record import AttendanceRecord
from app.models.attendance_scan import AttendanceScan
from app.models.student_device import StudentDevice
from app.models.user import User
from app.models.enums import UserRole
from app.core.security import hash_password

def _setup_course_and_student(db_session, test_organization, test_user, test_lecturer):
    # Create course
    course = Course(
        organization_id=test_organization.id,
        code="CS_ATT_TEST_" + str(uuid.uuid4())[:8],
        title="Attendance Testing",
        is_active=True,
    )
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    # Enroll the student (test_user)
    enrollment = Enrollment(course_id=course.id, student_id=test_user.id, is_active=True)
    db_session.add(enrollment)
    
    # Assign instructor
    db_session.add(CourseInstructor(course_id=course.id, instructor_id=test_lecturer.id))
    db_session.commit()
    
    return course

def test_scan_attendance_qr_validation(client, db_session, test_organization, test_user, lecturer_token, test_lecturer):
    course = _setup_course_and_student(db_session, test_organization, test_user, test_lecturer)
    headers = {"Authorization": f"Bearer {lecturer_token}"}

    starts_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    ends_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    
    session_response = client.post(
        f"/api/v1/courses/{course.id}/sessions",
        headers=headers,
        json={
            "title": "Session 1",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "late_after_minutes": 15,
            "qr_rotation_seconds": 30,
            "require_location": False,
            "require_device_check": False,
        }
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]

    # Start session
    start_resp = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert start_resp.status_code == 200
    qr_data = start_resp.json()["qr"]
    payload = qr_data["payload"]

    # student logs in to scan
    student_token_resp = client.post("/api/v1/auth/login", json={"email": test_user.email, "password": "testpassword"})
    student_headers = {"Authorization": f"Bearer {student_token_resp.json()['access_token']}"}

    # Successful Scan
    scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={"payload": payload}
    )
    assert scan_resp.status_code == 200
    assert scan_resp.json()["result"] == "accepted"

    # Duplicate scan check
    dup_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={"payload": payload}
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["result"] == "duplicate"
    
    # Expired token scan check
    expired_token = QRToken(
        session_id=uuid.UUID(session_id),
        nonce="expired_nonce",
        token_hash="expired_hash",
        is_active=True,
        issued_at=datetime.now(timezone.utc) - timedelta(minutes=10),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        created_by=test_lecturer.id,
    )
    db_session.add(expired_token)
    db_session.commit()
    
    expired_payload = json.dumps({
        "type": "qr_attendance",
        "session_id": session_id,
        "token_id": str(expired_token.id),
        "nonce": "expired_nonce"
    }, separators=(",", ":"), sort_keys=True)
    expired_token.token_hash = hashlib.sha256(expired_payload.encode("utf-8")).hexdigest()
    db_session.commit()

    # Create another student to scan the expired QR
    other_student = User(
        email="other_student@example.com",
        password_hash=hash_password("testpassword"),
        first_name="Other",
        last_name="Student",
        role=UserRole.student,
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()
    db_session.add(Enrollment(course_id=course.id, student_id=other_student.id, is_active=True))
    db_session.commit()

    other_token_resp = client.post("/api/v1/auth/login", json={"email": other_student.email, "password": "testpassword"})
    other_headers = {"Authorization": f"Bearer {other_token_resp.json()['access_token']}"}

    exp_scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=other_headers,
        json={"payload": expired_payload}
    )
    assert exp_scan_resp.status_code == 200
    assert exp_scan_resp.json()["result"] == "expired_token"

def test_scan_attendance_geofencing(client, db_session, test_organization, test_user, lecturer_token, test_lecturer):
    course = _setup_course_and_student(db_session, test_organization, test_user, test_lecturer)
    headers = {"Authorization": f"Bearer {lecturer_token}"}

    starts_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    ends_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    
    # Session requires geofence location check
    session_response = client.post(
        f"/api/v1/courses/{course.id}/sessions",
        headers=headers,
        json={
            "title": "Session 2",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "late_after_minutes": 15,
            "qr_rotation_seconds": 30,
            "require_location": True,
            "latitude": 6.5244,  # e.g. Lagos, Nigeria
            "longitude": 3.3792,
            "allowed_radius_meters": 50,  # 50m radius
            "require_device_check": False,
        }
    )
    assert session_response.status_code == 201
    session_id = session_response.json()["id"]

    # Start session
    start_resp = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    qr_data = start_resp.json()["qr"]
    payload = qr_data["payload"]

    student_token_resp = client.post("/api/v1/auth/login", json={"email": test_user.email, "password": "testpassword"})
    student_headers = {"Authorization": f"Bearer {student_token_resp.json()['access_token']}"}

    # 1. Scan from outside geofence (London, UK)
    outside_scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={
            "payload": payload,
            "latitude": 51.5074,
            "longitude": -0.1278
        }
    )
    assert outside_scan_resp.status_code == 200
    assert outside_scan_resp.json()["result"] == "outside_location"

    # 2. Scan from inside geofence (very close to Lagos coordinates)
    inside_scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={
            "payload": payload,
            "latitude": 6.52441,
            "longitude": 3.37921
        }
    )
    assert inside_scan_resp.status_code == 200
    assert inside_scan_resp.json()["result"] == "accepted"

def test_scan_attendance_device_verification(client, db_session, test_organization, test_user, lecturer_token, test_lecturer):
    course = _setup_course_and_student(db_session, test_organization, test_user, test_lecturer)
    headers = {"Authorization": f"Bearer {lecturer_token}"}

    starts_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    ends_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    
    session_response = client.post(
        f"/api/v1/courses/{course.id}/sessions",
        headers=headers,
        json={
            "title": "Session 3",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "require_location": False,
            "require_device_check": True,  # Require device checking
        }
    )
    session_id = session_response.json()["id"]

    # Start session
    start_resp = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    payload = start_resp.json()["qr"]["payload"]

    student_token_resp = client.post("/api/v1/auth/login", json={"email": test_user.email, "password": "testpassword"})
    student_headers = {"Authorization": f"Bearer {student_token_resp.json()['access_token']}"}

    # First Scan: Automatically registers device as primary trusted
    first_scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={"payload": payload, "device_fingerprint": "my_primary_phone"}
    )
    assert first_scan_resp.status_code == 200
    assert first_scan_resp.json()["result"] == "accepted"

    # Create another student who registers "device_a" first
    other_student = User(
        email="device_student@example.com",
        password_hash=hash_password("testpassword"),
        first_name="Device",
        last_name="Student",
        role=UserRole.student,
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(other_student)
    db_session.commit()
    db_session.add(Enrollment(course_id=course.id, student_id=other_student.id, is_active=True))
    db_session.commit()

    other_token_resp = client.post("/api/v1/auth/login", json={"email": other_student.email, "password": "testpassword"})
    other_headers = {"Authorization": f"Bearer {other_token_resp.json()['access_token']}"}

    # Register other student's primary device
    first_device_scan = client.post(
        "/api/v1/attendance/scan",
        headers=other_headers,
        json={"payload": payload, "device_fingerprint": "device_a"}
    )
    assert first_device_scan.status_code == 200
    assert first_device_scan.json()["result"] == "accepted"

    # Now create another session to scan with different device
    session_response_2 = client.post(
        f"/api/v1/courses/{course.id}/sessions",
        headers=headers,
        json={
            "title": "Session 4",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "require_location": False,
            "require_device_check": True,
        }
    )
    session_id_2 = session_response_2.json()["id"]
    start_resp_2 = client.post(f"/api/v1/sessions/{session_id_2}/start", headers=headers)
    payload_2 = start_resp_2.json()["qr"]["payload"]

    # Other student tries to scan using a different device "device_b"
    second_device_scan = client.post(
        "/api/v1/attendance/scan",
        headers=other_headers,
        json={"payload": payload_2, "device_fingerprint": "device_b"}
    )
    assert second_device_scan.status_code == 200
    assert second_device_scan.json()["result"] == "device_rejected"

def test_session_closure_absent_marking(client, db_session, test_organization, test_user, lecturer_token, test_lecturer):
    course = _setup_course_and_student(db_session, test_organization, test_user, test_lecturer)
    
    # Enroll another student (absent_student) who won't scan
    absent_student = User(
        email="absent_student@example.com",
        password_hash=hash_password("testpassword"),
        first_name="Absent",
        last_name="Student",
        role=UserRole.student,
        organization_id=test_organization.id,
        is_active=True,
    )
    db_session.add(absent_student)
    db_session.commit()
    db_session.add(Enrollment(course_id=course.id, student_id=absent_student.id, is_active=True))
    db_session.commit()

    headers = {"Authorization": f"Bearer {lecturer_token}"}
    starts_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    ends_at = datetime.now(timezone.utc) + timedelta(minutes=45)
    
    session_response = client.post(
        f"/api/v1/courses/{course.id}/sessions",
        headers=headers,
        json={
            "title": "Session for Absent Marking",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "require_location": False,
            "require_device_check": False,
        }
    )
    session_id = session_response.json()["id"]

    # Start session
    start_resp = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    payload = start_resp.json()["qr"]["payload"]

    # student (test_user) scans to mark present
    student_token_resp = client.post("/api/v1/auth/login", json={"email": test_user.email, "password": "testpassword"})
    student_headers = {"Authorization": f"Bearer {student_token_resp.json()['access_token']}"}

    scan_resp = client.post(
        "/api/v1/attendance/scan",
        headers=student_headers,
        json={"payload": payload}
    )
    assert scan_resp.status_code == 200
    assert scan_resp.json()["result"] == "accepted"

    # Close session (triggers automatic absent marking)
    close_resp = client.post(f"/api/v1/sessions/{session_id}/close", headers=headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "closed"

    # Check attendance records in DB
    recs = db_session.query(AttendanceRecord).filter_by(session_id=uuid.UUID(session_id)).all()
    assert len(recs) == 2  # Both students now have records
    
    # Student 1 (test_user) should be present
    present_rec = db_session.query(AttendanceRecord).filter_by(session_id=uuid.UUID(session_id), student_id=test_user.id).first()
    assert present_rec.status == AttendanceStatus.present

    # Student 2 (absent_student) should be absent
    absent_rec = db_session.query(AttendanceRecord).filter_by(session_id=uuid.UUID(session_id), student_id=absent_student.id).first()
    assert absent_rec.status == AttendanceStatus.absent
    assert absent_rec.note == "Automatically marked absent on session closure."
