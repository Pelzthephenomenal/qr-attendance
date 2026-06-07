# QR Attendance System - Development Roadmap

**Last Updated:** June 2026  
**Project Start:** June 2026  
**Target Launch:** Q4 2026

---

## Vision

Transform the current QR Attend prototype into a production-ready QR attendance management system that replaces manual attendance tracking with secure, auditable, automated QR code scanning while maintaining flexibility for manual overrides and institutional policies.

---

## Development Phases Overview

```
Phase 1 (Week 1-2)          Phase 2 (Week 3-4)        Phase 3 (Week 5-6)
├─ Authentication           ├─ Database Setup         ├─ Course Management
├─ User Sessions            ├─ Migrations             ├─ Enrollments
└─ RBAC                     └─ Data Seeding           └─ Department Management

Phase 4 (Week 7-8)          Phase 5 (Week 9-10)       Phase 6 (Week 11-12)
├─ Sessions & QR Tokens    ├─ QR Generation          ├─ Reports & Export
├─ Token Rotation          ├─ Mobile Scanner         ├─ Analytics Dashboard
└─ Session Management      └─ Scan Processing        └─ Performance Optimization

Phase 7 (Week 13-14)        Phase 8 (Week 15-16)      Phase 9 (Week 17-18)
├─ Background Jobs         ├─ Notifications          ├─ Docker & Deployment
├─ Email System            ├─ Real-time Updates      ├─ Staging Environment
└─ Report Export           └─ Push Notifications     └─ Production Launch
```

---

## Phase 1: Authentication & Authorization (Week 1-2)

**Goal:** Enable real user authentication replacing demo/localStorage identity.  
**Exit Criteria:** Users login with credentials, protected pages reject unauthorized access.

### Backend Tasks

- [ ] **Dependencies & Setup**
  - [ ] Create .env file with database, JWT, CORS settings
  - [ ] Install Python dependencies (alembic for migrations)
  - [ ] Configure FastAPI CORS middleware
  - [ ] Set up logging configuration

- [ ] **JWT & Cryptography**
  - [ ] Implement JWT token creation (access + refresh)
  - [ ] Implement JWT validation & decoding
  - [ ] Implement refresh token rotation
  - [ ] Hash passwords with bcrypt (10+ rounds)
  - [ ] Implement password verification

- [ ] **Authentication Endpoints**
  - [ ] `POST /api/v1/auth/register`
    - Request: email, password, first_name, last_name, role, department_id
    - Response: access_token, refresh_token, user object
    - Validation: Email uniqueness, password strength, role valid
    - Error: 409 if email exists, 422 if validation fails
  
  - [ ] `POST /api/v1/auth/login`
    - Request: email, password
    - Response: access_token, refresh_token, user object
    - Validation: Email exists, password correct, user active
    - Error: 401 if credentials invalid, 403 if not active
    - Log: Last login timestamp
  
  - [ ] `POST /api/v1/auth/refresh`
    - Request: refresh_token
    - Response: new access_token, new refresh_token
    - Validation: Token exists, not expired, not revoked
    - Error: 401 if token invalid/expired
    - Behavior: Rotate tokens (replace old refresh token)
  
  - [ ] `POST /api/v1/auth/logout`
    - Request: (none, uses auth header)
    - Response: { message: "Logged out" }
    - Action: Mark refresh token as revoked
  
  - [ ] `GET /api/v1/auth/me`
    - Request: (none, uses auth header)
    - Response: current user object + permissions
    - Validation: Token valid, user exists and active

- [ ] **Authorization Middleware**
  - [ ] JWT validation dependency (extract token, verify signature, check expiration)
  - [ ] Role-based access control (student, lecturer, admin, staff)
  - [ ] Organization isolation (users can only access their org)
  - [ ] Permission decorators (@require_role, @require_org)

- [ ] **Testing**
  - [ ] Unit tests for password hashing
  - [ ] Unit tests for JWT creation/validation
  - [ ] Integration tests for login (valid, invalid password, inactive user)
  - [ ] Integration tests for refresh (valid, expired, revoked)
  - [ ] Integration tests for logout
  - [ ] Integration tests for protected endpoints

- [ ] **Security**
  - [ ] Rate limiting on login endpoint (future: 5 attempts/minute)
  - [ ] Secure token storage strategy (httpOnly cookies recommended)
  - [ ] HTTPS enforcement (document requirement)
  - [ ] CORS configuration (allow only frontend origin)

### Frontend Tasks

- [ ] **Context API Update**
  - [ ] Replace mock auth context with API calls
  - [ ] Replace localStorage with secure token storage (memory + httpOnly cookie)
  - [ ] Implement token refresh logic
  - [ ] Implement logout functionality

- [ ] **Login Page Implementation**
  - [ ] Email input field
  - [ ] Password input field
  - [ ] Submit button (disabled while loading)
  - [ ] Error message display (invalid credentials)
  - [ ] Loading state
  - [ ] Link to password reset (future)

- [ ] **Protected Routes**
  - [ ] Create route protection wrapper (check auth before render)
  - [ ] Redirect unauthenticated to /login
  - [ ] Redirect wrong role to role dashboard
  - [ ] Handle expired tokens (redirect to login)
  - [ ] Handle token refresh on 401

- [ ] **Navigation & State**
  - [ ] Remove demo role tabs
  - [ ] Logout button in user dropdown
  - [ ] Show current user name/email in top bar
  - [ ] Implement loading skeleton while fetching /auth/me

- [ ] **Error Handling**
  - [ ] Display server validation errors
  - [ ] Network error handling
  - [ ] Timeout handling

- [ ] **Testing**
  - [ ] Unit tests for auth context
  - [ ] Integration tests for login flow
  - [ ] E2E test for login → dashboard redirect

### API Contract

```typescript
// Request/Response Types

// Auth Endpoints
POST /api/v1/auth/register
{
  "email": "student@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "department_id": "uuid-here"
}
Response 201:
{
  "access_token": "eyJ0...",
  "refresh_token": "eyJ0...",
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "student",
    "is_verified": false
  }
}

POST /api/v1/auth/login
{
  "email": "student@example.com",
  "password": "SecurePassword123!"
}
Response 200: { access_token, refresh_token, user }

POST /api/v1/auth/refresh
{
  "refresh_token": "eyJ0..."
}
Response 200: { access_token, refresh_token }

POST /api/v1/auth/logout
Response 200: { message: "Logged out" }

GET /api/v1/auth/me
Response 200: { user, permissions: ["read:courses", ...] }
```

---

## Phase 2: Database Setup & Migrations (Week 3-4)

**Goal:** Deploy PostgreSQL and establish database migration pipeline.  
**Exit Criteria:** Schema deployed, migrations working, data seeding functional.

### Backend Tasks

- [ ] **Database Connection**
  - [ ] Create PostgreSQL database locally and on RDS (staging)
  - [ ] Configure connection pooling (PgBouncer or SQLAlchemy)
  - [ ] Test connection from FastAPI app
  - [ ] Set DATABASE_URL in .env

- [ ] **Alembic Setup**
  - [ ] Initialize Alembic in backend/
  - [ ] Configure alembic.ini
  - [ ] Create initial migration (empty)
  - [ ] Test upgrade/downgrade workflow

- [ ] **Schema Migrations**
  - [ ] Create migration: organizations table
  - [ ] Create migration: departments table
  - [ ] Create migration: users table (with enums)
  - [ ] Create migration: courses, course_instructors, enrollments
  - [ ] Create migration: attendance_sessions, qr_tokens
  - [ ] Create migration: attendance_scans, attendance_records
  - [ ] Create migration: refresh_tokens
  - [ ] Create migration: audit_logs, notifications
  - [ ] Create migration: indexes (performance)
  - [ ] Verify schema against database_schema.sql

- [ ] **Data Integrity**
  - [ ] Add foreign key constraints
  - [ ] Add uniqueness constraints
  - [ ] Add check constraints (e.g., end_at > start_at)
  - [ ] Add not-null constraints

- [ ] **Seed Data Script**
  - [ ] Create script to seed mock data for testing
  - [ ] Organizations (1-2 test orgs)
  - [ ] Departments (3-4 per org)
  - [ ] Users (5 admins, 10 lecturers, 50 students per org)
  - [ ] Courses (20-30 per org)
  - [ ] Enrollments (random students to courses)
  - [ ] Document seed data structure

- [ ] **Testing**
  - [ ] Test migration up/down
  - [ ] Test seed script
  - [ ] Verify data consistency
  - [ ] Performance test on 10,000+ rows

### Frontend Tasks

- [ ] **Update API Client**
  - [ ] Remove mock data dependencies
  - [ ] Create API client utility (baseURL, headers, error handling)
  - [ ] Implement request interceptors (JWT injection)
  - [ ] Implement response interceptors (401 handling)

- [ ] **Integration Preparation**
  - [ ] Update components to accept real data shapes
  - [ ] Remove hardcoded mock data
  - [ ] Prepare loading/error states

### Documentation

- [ ] **Migration Guide**
  - [ ] How to create new migrations
  - [ ] How to apply migrations
  - [ ] How to rollback
  - [ ] Migration best practices

- [ ] **Schema Documentation**
  - [ ] Entity diagrams
  - [ ] Constraint descriptions
  - [ ] Query examples
  - [ ] Performance considerations

---

## Phase 3: Course & Enrollment Management (Week 5-6)

**Goal:** Implement course CRUD and student enrollments.  
**Exit Criteria:** Admins can manage courses, students can enroll, data persists.

### Backend Tasks

- [ ] **Organization Endpoints** (Multi-tenancy)
  - [ ] `GET /api/v1/organizations/{org_id}` - Get org details
  - [ ] `PUT /api/v1/organizations/{org_id}` - Update org (admin only)
  - [ ] `GET /api/v1/organizations/{org_id}/departments` - List departments

- [ ] **Department Endpoints**
  - [ ] `GET /api/v1/departments` - List departments (with course count)
  - [ ] `POST /api/v1/departments` - Create department (admin only)
  - [ ] `PUT /api/v1/departments/{dept_id}` - Update (admin only)
  - [ ] `DELETE /api/v1/departments/{dept_id}` - Soft delete (admin only)

- [ ] **Course Endpoints**
  - [ ] `GET /api/v1/courses` - List courses (paginated, filterable by dept/year/term)
  - [ ] `GET /api/v1/courses/{course_id}` - Get course + enrollments
  - [ ] `POST /api/v1/courses` - Create course (admin only)
    - Input: code, title, description, department_id, academic_year, term, level
    - Validation: Unique within org+year+term
  - [ ] `PUT /api/v1/courses/{course_id}` - Update (admin/creator only)
  - [ ] `DELETE /api/v1/courses/{course_id}` - Soft delete (admin only)

- [ ] **Course Instructor Endpoints**
  - [ ] `POST /api/v1/courses/{course_id}/instructors` - Assign instructor
  - [ ] `DELETE /api/v1/courses/{course_id}/instructors/{instructor_id}` - Remove

- [ ] **Enrollment Endpoints**
  - [ ] `GET /api/v1/courses/{course_id}/enrollments` - List enrolled students
  - [ ] `POST /api/v1/courses/{course_id}/enroll` - Student self-enroll
    - Validation: User not already enrolled, not dropped
    - Create enrollment record
  - [ ] `POST /api/v1/courses/{course_id}/enroll-bulk` - Admin bulk enroll
    - Input: list of student_ids
  - [ ] `DELETE /api/v1/enrollments/{enrollment_id}` - Drop course (student or admin)
  - [ ] `GET /api/v1/student/courses` - List enrolled courses for current student

- [ ] **Business Logic Services**
  - [ ] CourseService.create() - Validate, check duplicates, create
  - [ ] CourseService.get_enrollments() - List with pagination
  - [ ] EnrollmentService.enroll_student() - Check prerequisites, create enrollment
  - [ ] EnrollmentService.drop_course() - Mark dropped_at, set is_active=false

- [ ] **Validation & Constraints**
  - [ ] Course code unique within org+year+term
  - [ ] Cannot enroll in dropped course
  - [ ] Cannot enroll if already enrolled
  - [ ] Only instructor role can be assigned to courses

- [ ] **Testing**
  - [ ] Unit tests for service logic
  - [ ] Integration tests for all endpoints
  - [ ] Test pagination, filtering
  - [ ] Test access control (only admins can create courses)

### Frontend Tasks

- [ ] **Admin Course Management Page**
  - [ ] Course list (table with code, title, department, year, term)
  - [ ] Add course button → modal/form
  - [ ] Edit course → modal/form
  - [ ] Delete course → confirmation
  - [ ] Search/filter by department, year, term
  - [ ] Pagination controls

- [ ] **Course Details Page**
  - [ ] Course info (code, title, instructors, department)
  - [ ] Enrolled students list (admin/lecturer view)
  - [ ] Enrollment count
  - [ ] Edit button (instructor/admin only)

- [ ] **Student Enrollment Page**
  - [ ] Browse available courses
  - [ ] Search and filter
  - [ ] "Enroll" button
  - [ ] Confirmation dialog
  - [ ] My courses list (enrolled courses)

- [ ] **Lecturer Course Management Page**
  - [ ] List of courses taught
  - [ ] Student enrollment list per course
  - [ ] Link to start attendance session

### API Contract Example

```typescript
GET /api/v1/courses?page=1&limit=20&department_id=uuid&year=2025
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "code": "CS101",
      "title": "Introduction to Computer Science",
      "department_id": "uuid",
      "department_name": "Computer Science",
      "academic_year": "2025/2026",
      "term": "Semester 1",
      "enrollment_count": 45,
      "is_active": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}

POST /api/v1/courses/{course_id}/enroll
Response 201:
{
  "id": "uuid",
  "course_id": "uuid",
  "student_id": "uuid",
  "enrolled_at": "2025-06-01T10:00:00Z",
  "is_active": true
}
```

---

## Phase 4: Attendance Session Management (Week 7-8)

**Goal:** Enable lecturers to create and manage attendance sessions.  
**Exit Criteria:** Lecturers can create sessions, modify rules, track in real-time.

### Backend Tasks

- [ ] **Session Endpoints**
  - [ ] `POST /api/v1/sessions` - Create session
    - Input: course_id, title, session_date, starts_at, ends_at, location, etc
    - Validation: User is instructor, datetime valid
  - [ ] `GET /api/v1/sessions/{session_id}` - Get session details
  - [ ] `PUT /api/v1/sessions/{session_id}` - Update session
  - [ ] `DELETE /api/v1/sessions/{session_id}` - Cancel session

- [ ] **Session Lifecycle**
  - [ ] `POST /api/v1/sessions/{session_id}/start` - Change status to 'active'
    - Validation: Current time within session window
    - Action: Generate initial QR token
  - [ ] `POST /api/v1/sessions/{session_id}/close` - Change status to 'closed'
    - Validation: Session is active
    - Action: Revoke QR token

- [ ] **Session Queries**
  - [ ] `GET /api/v1/courses/{course_id}/sessions` - List sessions for course
  - [ ] `GET /api/v1/sessions/{session_id}/attendance` - List attendance records

- [ ] **Session Configuration**
  - [ ] Support fields: late_after_minutes, qr_rotation_seconds
  - [ ] Optional geofencing: latitude, longitude, allowed_radius_meters
  - [ ] Optional device check: require_device_check

- [ ] **Session Validation Rules**
  - [ ] End time must be after start time
  - [ ] Can only start session within configured time window
  - [ ] Can only have one active session per course at a time
  - [ ] Only assigned instructor can modify session

- [ ] **Testing**
  - [ ] Test session creation with valid/invalid inputs
  - [ ] Test start/close transitions
  - [ ] Test access control (only instructor)
  - [ ] Test datetime validation

### Frontend Tasks

- [ ] **Lecturer Session Management Page**
  - [ ] List sessions for each course (date, time, status)
  - [ ] Create session button → modal
  - [ ] Session details view
  - [ ] Start/close buttons
  - [ ] Edit session (if not started)
  - [ ] Cancel session option

- [ ] **Session Details Page** (Lecturer View)
  - [ ] Course info
  - [ ] Session datetime, location
  - [ ] Configuration (late_after_minutes, etc)
  - [ ] Real-time attendance count
  - [ ] "Generate QR Code" button

- [ ] **Forms & Validation**
  - [ ] Session creation form (title, date, time, location, settings)
  - [ ] Client-side validation (datetime, required fields)

### API Contract Example

```typescript
POST /api/v1/sessions
{
  "course_id": "uuid",
  "title": "Lecture 5",
  "session_date": "2025-06-10",
  "starts_at": "2025-06-10T10:00:00Z",
  "ends_at": "2025-06-10T12:00:00Z",
  "location_name": "Room 101, Building A",
  "late_after_minutes": 15,
  "qr_rotation_seconds": 30,
  "require_location": false
}
Response 201:
{
  "id": "uuid",
  "course_id": "uuid",
  "status": "draft",
  "created_at": "2025-06-01T10:00:00Z"
}
```

---

## Phase 5: QR Generation & Scanning (Week 9-10)

**Goal:** Generate and validate secure QR codes for attendance tracking.  
**Exit Criteria:** Lecturers can display QR, students can scan and submit.

### Backend Tasks

- [ ] **QR Token Generation**
  - [ ] Create signed JWT tokens with session context
  - [ ] Hash tokens before storage (never store plaintext)
  - [ ] Set TTL (30-60 seconds default)
  - [ ] Include nonce for replay prevention
  - [ ] Token format: `{session_id, expires_at, nonce, signature}`

- [ ] **QR Endpoints**
  - [ ] `GET /api/v1/sessions/{session_id}/qr-token` - Get current QR
    - Returns: base64-encoded QR image or token string (frontend generates)
    - Validation: Session active
    - If token expired, generate new one
  - [ ] `POST /api/v1/qr-tokens/rotate` - Explicitly rotate token (if needed)

- [ ] **QR Token Rotation**
  - [ ] Background task to rotate tokens every 30-60 seconds
  - [ ] Revoke old token (set revoked_at)
  - [ ] Create new token with same session_id
  - [ ] Frontend polls for new QR periodically

- [ ] **Scan Processing**
  - [ ] `POST /api/v1/attendance/scan` - Process QR scan
    - Input: QR token (from scanned code)
    - Validation:
      - Verify JWT signature
      - Check token not expired
      - Check token not revoked
      - Get session from token
      - Check session is active
      - Check user is enrolled in course
      - Check no duplicate scan by user in session
      - Optional: Check geofencing (if enabled)
      - Optional: Check device (if enabled)
    - Action: Create attendance_scans record with result
    - Action: Create/update attendance_records record
    - Action: Log to audit_logs
    - Response: Attendance status (present, late, duplicate, etc)

- [ ] **Duplicate Detection**
  - [ ] Track scanned QR tokens (prevent reuse)
  - [ ] Check user has not already been marked in session
  - [ ] Return 409 Conflict if duplicate

- [ ] **Late Marking**
  - [ ] Calculate minutes_late based on scan time vs session start time
  - [ ] Mark as "late" if minutes_late > late_after_minutes

- [ ] **Error Handling**
  - [ ] Invalid token → 401
  - [ ] Expired token → 401
  - [ ] Not enrolled → 403
  - [ ] Session inactive → 422
  - [ ] Duplicate scan → 409
  - [ ] Outside geofence → 422
  - [ ] Device rejected → 403

- [ ] **Testing**
  - [ ] Unit tests for QR token generation and validation
  - [ ] Integration tests for scan processing
  - [ ] Test duplicate detection
  - [ ] Test geofencing logic (if implemented)
  - [ ] Test device verification (if implemented)
  - [ ] Stress test: 1000 concurrent scans

### Frontend Tasks

- [ ] **QR Display (Lecturer)**
  - [ ] QR code image (generated via backend or qrcode.js)
  - [ ] Auto-refresh QR every 30-60 seconds
  - [ ] Display token expiration countdown
  - [ ] Manual refresh button
  - [ ] Real-time attendance count (poll attendance records)

- [ ] **QR Scanner (Student)**
  - [ ] Camera access permission
  - [ ] Camera feed preview
  - [ ] @zxing/browser for QR detection
  - [ ] On scan: Extract token string
  - [ ] Submit token to backend
  - [ ] Show response (success, error, duplicate)
  - [ ] Option to manually enter token (fallback)
  - [ ] Toast notification with result

- [ ] **Scan Result UI**
  - [ ] Success: "Marked present" / "Marked late" (green)
  - [ ] Duplicate: "Already scanned" (warning)
  - [ ] Expired: "Token expired, please rescan" (error)
  - [ ] Not enrolled: "Not enrolled in this course" (error)
  - [ ] Session inactive: "Session not active" (error)

- [ ] **Testing**
  - [ ] QR code generation and display
  - [ ] Camera integration
  - [ ] Scan submit and response handling
  - [ ] Error state UI

### API Contract Example

```typescript
GET /api/v1/sessions/{session_id}/qr-token
Response 200:
{
  "qr_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "expires_at": "2025-06-10T10:05:30Z",
  "rotation_interval_seconds": 30
}

POST /api/v1/attendance/scan
{
  "qr_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
Response 200:
{
  "status": "present",
  "message": "Marked present",
  "marked_at": "2025-06-10T10:03:45Z",
  "session_id": "uuid"
}

Response 409 (Duplicate):
{
  "detail": "Already marked in this session",
  "error_code": "duplicate_scan"
}
```

---

## Phase 6: Reporting & Analytics (Week 11-12)

**Goal:** Provide insights into attendance patterns and trends.  
**Exit Criteria:** All roles can access relevant reports; data exports functional.

### Backend Tasks

- [ ] **Report Endpoints**
  - [ ] `GET /api/v1/reports/attendance/student/{student_id}` - Student record
    - Query params: date_from, date_to, course_id
    - Response: list of sessions + status, percentage
  - [ ] `GET /api/v1/reports/attendance/course/{course_id}` - Course report
    - Response: per-student status, class average, trends
  - [ ] `GET /api/v1/reports/attendance/department/{dept_id}` - Department summary
    - Response: per-course averages, trends
  - [ ] `GET /api/v1/reports/attendance/organization` - Org-wide summary

- [ ] **Report Calculations**
  - [ ] Attendance percentage: (present + late) / total sessions
  - [ ] On-time percentage: present / total sessions
  - [ ] Absence count, late count
  - [ ] Trend analysis: week-over-week, month-over-month

- [ ] **Export Endpoints**
  - [ ] `POST /api/v1/reports/export` - Export to CSV/PDF
    - Input: report_type, filters, format
    - Action: Generate file, store in S3 (future), return download link
    - Response: { download_url, expires_at }
  - [ ] `GET /api/v1/reports/export/{export_id}` - Check export status

- [ ] **Dashboard Endpoints** (Aggregated data)
  - [ ] `GET /api/v1/dashboard/student` - Student dashboard summary
  - [ ] `GET /api/v1/dashboard/lecturer` - Lecturer dashboard summary
  - [ ] `GET /api/v1/dashboard/admin` - Admin dashboard summary

- [ ] **Analytics Data Model**
  - [ ] Cache aggregated reports (Redis)
  - [ ] Background job to pre-compute daily summaries
  - [ ] Query optimization (indexes, materialized views)

- [ ] **Testing**
  - [ ] Test report calculations accuracy
  - [ ] Test export generation
  - [ ] Test access control (student can't see other students' reports)
  - [ ] Performance test on 100,000+ records

### Frontend Tasks

- [ ] **Student Dashboard**
  - [ ] Course list with attendance percentage
  - [ ] Visual indicators (good/warning/critical)
  - [ ] Attendance history chart (mini)
  - [ ] Recent scans list

- [ ] **Lecturer Dashboard**
  - [ ] Course list with session count
  - [ ] Average attendance per course
  - [ ] Today's sessions status
  - [ ] Class attendance distribution chart
  - [ ] Recent attendance records

- [ ] **Admin Dashboard**
  - [ ] Organization-wide statistics
  - [ ] Department breakdown
  - [ ] User count by role
  - [ ] System health metrics
  - [ ] Recent audit log entries

- [ ] **Analytics Pages**
  - [ ] Detailed attendance reports
  - [ ] Filters: date range, course, department
  - [ ] Charts: line chart (trends), bar chart (distribution), pie chart (status breakdown)
  - [ ] Export button (CSV/PDF)

- [ ] **Report Components**
  - [ ] AttendanceChart (Recharts)
  - [ ] AttendanceTable (sortable, paginated)
  - [ ] ReportDownload (file generation status)

- [ ] **Testing**
  - [ ] Chart rendering with real data
  - [ ] Report filtering and sorting
  - [ ] Export functionality
  - [ ] Access control (only own data visible)

### API Contract Example

```typescript
GET /api/v1/reports/attendance/student/{student_id}?date_from=2025-01-01&date_to=2025-06-10
Response 200:
{
  "student_id": "uuid",
  "student_name": "John Doe",
  "total_sessions": 48,
  "present_count": 45,
  "late_count": 2,
  "absent_count": 1,
  "attendance_percentage": 97.9,
  "records": [
    {
      "session_id": "uuid",
      "course_id": "uuid",
      "course_code": "CS101",
      "session_date": "2025-06-10",
      "status": "present",
      "marked_at": "2025-06-10T10:03:45Z"
    }
  ]
}

POST /api/v1/reports/export
{
  "report_type": "attendance_student",
  "filters": { "student_id": "uuid", "date_from": "2025-01-01", "date_to": "2025-06-10" },
  "format": "csv"
}
Response 202 (Accepted):
{
  "export_id": "uuid",
  "status": "processing",
  "estimated_completion": "2025-06-01T10:05:00Z"
}
```

---

## Phase 7: Background Jobs & Notifications (Week 13-14)

**Goal:** Automate repetitive tasks and keep users informed.  
**Exit Criteria:** Email notifications sent, exports generated, cleanup jobs running.

### Backend Tasks

- [ ] **Job Queue Setup** (Celery or RQ)
  - [ ] Configure Redis connection
  - [ ] Configure Celery workers
  - [ ] Set up task routing and retry policies

- [ ] **Email Tasks**
  - [ ] Send registration confirmation email
  - [ ] Send password reset email
  - [ ] Send low attendance alert (background job)
  - [ ] Send session reminder (1 hour before start)
  - [ ] Email template system (Jinja2)

- [ ] **Export Tasks**
  - [ ] Generate PDF report (reportlab)
  - [ ] Generate CSV export (pandas)
  - [ ] Upload to S3 (if available)
  - [ ] Email download link to user

- [ ] **Cleanup Tasks**
  - [ ] Delete expired QR tokens (daily)
  - [ ] Delete expired refresh tokens (daily)
  - [ ] Archive old audit logs (monthly)
  - [ ] Clean up temporary files (daily)

- [ ] **Notification System**
  - [ ] `POST /api/v1/notifications/mark-read` - Mark notification as read
  - [ ] `GET /api/v1/notifications` - List unread notifications
  - [ ] `DELETE /api/v1/notifications/{notification_id}` - Delete notification
  - [ ] Create notification records (from jobs or system events)

- [ ] **Scheduled Tasks**
  - [ ] QR token rotation (every 30-60 seconds during session)
  - [ ] Session status auto-close (when session end time reached)
  - [ ] Low attendance alert (daily at 5 PM)
  - [ ] Session reminder (30/60 minutes before start)

- [ ] **Testing**
  - [ ] Test email sending (mock SMTP)
  - [ ] Test job retry logic
  - [ ] Test cleanup tasks
  - [ ] Test notifications creation and retrieval

### Frontend Tasks

- [ ] **Notification Bell**
  - [ ] Bell icon in top bar
  - [ ] Unread count badge
  - [ ] Click → notification panel
  - [ ] Mark as read
  - [ ] Delete notification

- [ ] **Notification Center Page**
  - [ ] List of all notifications (paginated)
  - [ ] Filter by type (attendance, system, etc)
  - [ ] Mark all as read button
  - [ ] Timestamp display ("2 hours ago", etc)

- [ ] **Real-time Notifications** (Future - WebSocket)
  - [ ] Toast notification when new message arrives
  - [ ] Auto-dismiss after 5 seconds
  - [ ] Action button (e.g., "View report")

### API Contract Example

```typescript
GET /api/v1/notifications?limit=20
Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "attendance_reminder",
      "title": "Upcoming: Lecture 5",
      "content": "Your CS101 lecture starts in 1 hour (10:00 AM)",
      "is_read": false,
      "created_at": "2025-06-10T09:00:00Z"
    }
  ]
}

POST /api/v1/notifications/{notification_id}/mark-read
Response 200: { message: "Marked as read" }
```

---

## Phase 8: Deployment & DevOps (Week 15-16)

**Goal:** Prepare system for production deployment.  
**Exit Criteria:** Docker containers built, CI/CD configured, staging environment live.

### Backend Tasks

- [ ] **Docker Setup**
  - [ ] Create Dockerfile for FastAPI app
  - [ ] Create docker-compose.yml (app + PostgreSQL + Redis)
  - [ ] Build and test image locally
  - [ ] Push to registry (Docker Hub, ECR, etc)

- [ ] **Environment Configuration**
  - [ ] Separate .env files (dev, staging, prod)
  - [ ] Document all required environment variables
  - [ ] Secure secrets management (AWS Secrets Manager, etc)

- [ ] **Logging & Monitoring**
  - [ ] Structured logging (JSON format)
  - [ ] Log aggregation (CloudWatch, ELK)
  - [ ] Request/response logging
  - [ ] Error tracking (Sentry)
  - [ ] Performance monitoring (New Relic, Datadog)

- [ ] **Security Hardening**
  - [ ] HTTPS/TLS enforcement
  - [ ] Security headers (HSTS, X-Frame-Options, etc)
  - [ ] Rate limiting (per IP, per user)
  - [ ] CORS whitelist
  - [ ] Input validation and sanitization

- [ ] **Database**
  - [ ] Backup strategy (daily backups, point-in-time restore)
  - [ ] Replication setup (if multi-region)
  - [ ] Connection pooling optimization
  - [ ] Query performance tuning

- [ ] **API Documentation**
  - [ ] Swagger/OpenAPI spec
  - [ ] Generate API docs from code
  - [ ] Authentication examples
  - [ ] Error code reference

### Frontend Tasks

- [ ] **Build Optimization**
  - [ ] Code splitting (per route)
  - [ ] Image optimization (next/image)
  - [ ] Bundle analysis
  - [ ] CSS/JS minification

- [ ] **Docker Setup**
  - [ ] Create Dockerfile for Next.js app
  - [ ] Multi-stage build (build + runtime)
  - [ ] ENV configuration
  - [ ] Health check

- [ ] **Environment Configuration**
  - [ ] API base URL per environment
  - [ ] Feature flags (if needed)
  - [ ] Analytics tracking setup
  - [ ] Error tracking integration

- [ ] **Performance**
  - [ ] Lighthouse audit
  - [ ] Core Web Vitals optimization
  - [ ] Accessibility audit (WCAG 2.1 AA)

### DevOps/Infrastructure Tasks

- [ ] **CI/CD Pipeline** (GitHub Actions, GitLab CI, etc)
  - [ ] Linting and tests on PR
  - [ ] Build and push Docker images
  - [ ] Deploy to staging on main branch
  - [ ] Manual approval for production

- [ ] **Staging Environment**
  - [ ] Replica of production setup
  - [ ] Test database (with anonymized prod data)
  - [ ] Separate AWS/cloud accounts
  - [ ] Pre-production testing

- [ ] **Production Readiness**
  - [ ] Disaster recovery plan
  - [ ] Rollback strategy
  - [ ] Monitoring and alerting setup
  - [ ] On-call rotation

### Testing Tasks

- [ ] **Load Testing**
  - [ ] 1000 concurrent users
  - [ ] QR scanning burst (100 scans/sec)
  - [ ] Report generation under load
  - [ ] Database connection exhaustion

- [ ] **Security Testing**
  - [ ] Penetration testing
  - [ ] SQL injection tests
  - [ ] XSS vulnerability tests
  - [ ] CSRF token validation

---

## Phase 9: Production Launch (Week 17-18)

**Goal:** Launch system to users.  
**Exit Criteria:** All systems operational, users migrated, stable production environment.

### Pre-Launch Checklist

- [ ] **Data Migration**
  - [ ] Export existing attendance data (if applicable)
  - [ ] Transform to new schema format
  - [ ] Validate data integrity
  - [ ] Test restore procedure

- [ ] **User Communication**
  - [ ] Training materials for lecturers
  - [ ] Training materials for students
  - [ ] FAQ document
  - [ ] Support contact info

- [ ] **Monitoring & Support**
  - [ ] 24/7 monitoring alerts configured
  - [ ] Support ticket system ready
  - [ ] Incident response plan
  - [ ] Runbooks for common issues

- [ ] **Performance Baseline**
  - [ ] Establish performance metrics
  - [ ] Set up dashboards
  - [ ] Document normal ranges

### Launch Day Tasks

- [ ] **Final Checks**
  - [ ] Health checks on all services
  - [ ] Database backup before launch
  - [ ] Smoke tests (login, scan, report)
  - [ ] Load test verification

- [ ] **Deployment**
  - [ ] Deploy to production
  - [ ] Monitor error rates and latency
  - [ ] Scale up if needed
  - [ ] Notify stakeholders

- [ ] **User Onboarding**
  - [ ] Email to all users with login instructions
  - [ ] Live support team on standby
  - [ ] Monitor support tickets

### Post-Launch Tasks

- [ ] **Monitoring & Optimization**
  - [ ] Monitor error rates (< 1%)
  - [ ] Monitor latency (< 200ms p95)
  - [ ] Optimize slow queries
  - [ ] Scale as needed

- [ ] **Bug Fixes**
  - [ ] Triage reported issues
  - [ ] Hotfix critical bugs (within 1 hour)
  - [ ] Deploy fixes to production

- [ ] **Performance Tuning**
  - [ ] Analyze query logs
  - [ ] Add indexes if needed
  - [ ] Cache frequently accessed data
  - [ ] Optimize database schema

---

## Success Criteria by Phase

### Phase 1: Authentication ✅
- [x] Users can login with email/password
- [x] Protected pages reject unauthenticated requests
- [x] Token refresh works correctly
- [x] Logout revokes tokens

### Phase 2: Database ✅
- [x] Schema deployed successfully
- [x] Migrations apply cleanly
- [x] Seed data loads correctly
- [x] Backup/restore works

### Phase 3: Courses ✅
- [x] Admins can create/update courses
- [x] Students can enroll in courses
- [x] Enrollment data persists correctly
- [x] Duplicate enrollments prevented

### Phase 4: Sessions ✅
- [x] Lecturers can create attendance sessions
- [x] Sessions have proper lifecycle (draft → active → closed)
- [x] Session data displays correctly on frontend

### Phase 5: QR & Scanning ✅
- [x] QR codes generate and display
- [x] QR tokens validate correctly
- [x] Students can scan and get marked present
- [x] Duplicate scans detected
- [x] Late marking works

### Phase 6: Reporting ✅
- [x] Attendance reports generate accurately
- [x] Reports can be filtered by date range
- [x] Exports to CSV/PDF work
- [x] Performance acceptable (< 2s)

### Phase 7: Jobs & Notifications ✅
- [x] Background jobs execute on schedule
- [x] Email notifications sent correctly
- [x] Notification UI displays messages
- [x] Cleanup jobs remove old data

### Phase 8: Deployment ✅
- [x] Docker images build successfully
- [x] CI/CD pipeline functional
- [x] Staging environment operational
- [x] All security checks pass

### Phase 9: Production ✅
- [x] Zero critical issues in first week
- [x] Uptime > 99.9%
- [x] API response time < 200ms (p95)
- [x] User satisfaction > 80%

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Database performance degrades | High | Medium | Early load testing, index planning, connection pooling |
| Authentication token leaks | Critical | Low | HTTPS only, secure storage, rate limiting |
| QR scanning fails at scale | High | Medium | Stress test early, optimize token validation |
| Data migration issues | High | Low | Test migration script thoroughly, backup before |
| Third-party service outage | Medium | Low | Fallback options, graceful degradation |

### Organizational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Scope creep | High | High | Strict phase gates, requirements freeze |
| Resource shortage | High | Medium | Hire contractors, adjust timeline |
| Stakeholder misalignment | Medium | Medium | Regular demos, communication, steering committee |
| User adoption resistance | Medium | High | Training, support, change management plan |

---

## Timeline Summary

```
June 2026
├─ Week 1-2: Phase 1 (Auth)        [████████░░]
├─ Week 3-4: Phase 2 (Database)    [████████░░]
├─ Week 5-6: Phase 3 (Courses)     [████████░░]
├─ Week 7-8: Phase 4 (Sessions)    [████████░░]
└─ Week 9-10: Phase 5 (QR)         [████████░░]

July 2026
├─ Week 11-12: Phase 6 (Reports)   [████████░░]
├─ Week 13-14: Phase 7 (Jobs)      [████████░░]
├─ Week 15-16: Phase 8 (Deploy)    [████████░░]
└─ Week 17-18: Phase 9 (Launch)    [████████░░]

Total: 18 weeks to production launch
Buffer: 2-4 weeks for unforeseen issues
```

---

## Team Responsibilities

### Backend (Python/FastAPI)
- [ ] Database schema and migrations
- [ ] API endpoint implementation
- [ ] Business logic services
- [ ] Authentication and authorization
- [ ] Testing (unit, integration)

### Frontend (TypeScript/React)
- [ ] UI component implementation
- [ ] Page development
- [ ] API integration
- [ ] Error handling and loading states
- [ ] Testing (unit, integration, E2E)

### DevOps/Infrastructure
- [ ] Docker and containerization
- [ ] CI/CD pipeline setup
- [ ] Cloud infrastructure (AWS/Azure/GCP)
- [ ] Monitoring and logging
- [ ] Security hardening

### QA/Testing
- [ ] Test plan creation
- [ ] Manual testing
- [ ] Automation test development
- [ ] Load and performance testing
- [ ] Security testing

---

## Next Steps

1. **Week 1 Kickoff Meeting**
   - Review roadmap with team
   - Assign responsibilities
   - Set up development environment
   - Create initial feature branch

2. **Phase 1 Execution**
   - Implement authentication endpoints
   - Integrate frontend with auth API
   - Test login flow
   - Set up protected routes

3. **Weekly Standups**
   - 15-minute daily standups
   - Block review on Fridays
   - Phase gate approval before next phase

---

## Related Documentation

- **Project Analysis:** `PROJECT_ANALYSIS.md`
- **System Architecture:** `SYSTEM_ARCHITECTURE.md`
- **Database Schema:** `DATABASE_SCHEMA.md`
- **Backend Architecture:** `backend_architecture.md`
- **Task Tracking:** `TASKS.md`

