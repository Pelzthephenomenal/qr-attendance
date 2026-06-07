# QR Attendance System - System Architecture

**Last Updated:** June 2026  
**Architecture Version:** 1.0 (Design Phase)

---

## 1. High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CLIENTS                              │
│  (Browser - Student / Lecturer / Admin)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ HTTPS/WSS
                     │ REST API / WebSocket
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    FRONTEND LAYER (Next.js)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Pages: student, lecturer, admin (role-based routes)     │   │
│  │ Components: UI library (Radix + Tailwind)               │   │
│  │ State: Auth context, Local storage                      │   │
│  │ QR: Scanning (@zxing), Generation (server)             │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        │ REST API Calls          │ WebSocket (Future)
        │ JSON over HTTP/TLS      │ Real-time Updates
        │                         │
┌───────▼────────────────────────▼──────────────────────────────┐
│                  API GATEWAY & MIDDLEWARE                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CORS, Rate Limiting, Request Logging                    │  │
│  │ JWT Validation, Role-Based Access Control               │  │
│  │ Request/Response Serialization                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬────────────────────────────────────────────────────────┘
        │
        │ FastAPI Router
        │
┌───────▼────────────────────────────────────────────────────────┐
│               BACKEND APPLICATION LAYER (FastAPI)              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API v1 Routes:                                           │  │
│  │  • Auth (login, register, token refresh, logout)        │  │
│  │  • Users (CRUD, profile, password reset)                │  │
│  │  • Organizations (multi-tenancy)                        │  │
│  │  • Departments (organizational units)                   │  │
│  │  • Courses (course management)                          │  │
│  │  • Enrollments (student-course relationships)           │  │
│  │  • Sessions (attendance sessions)                       │  │
│  │  • QR Tokens (generation, validation)                   │  │
│  │  • Attendance (scans, records, marking)                 │  │
│  │  • Reports (analytics, exports)                         │  │
│  │  • Admin (system-wide management)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Service Layer (Business Logic):                          │  │
│  │  • AuthService (JWT, password hashing, user auth)       │  │
│  │  • QRService (token generation, validation, rotation)   │  │
│  │  • AttendanceService (scan processing, recording)       │  │
│  │  • ReportService (analytics, data aggregation)          │  │
│  │  • NotificationService (alerts, messages)               │  │
│  │  • AuditService (event logging, compliance)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Repository Layer (Data Access):                          │  │
│  │  • UserRepository (SQL queries, caching)                │  │
│  │  • CourseRepository (queries, relationships)            │  │
│  │  • AttendanceRepository (scans, records)                │  │
│  │  • QRTokenRepository (token lifecycle)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Utilities & Helpers:                                     │  │
│  │  • Security (JWT, password hashing, OAuth ready)        │  │
│  │  • Validation (Pydantic schemas)                        │  │
│  │  • Config (environment, settings)                       │  │
│  │  • Exceptions (custom error handling)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬────────────────────────────────────────────────────────┘
        │
        │ SQLAlchemy ORM
        │ Connection Pooling
        │
┌───────▼────────────────────────────────────────────────────────┐
│                  PERSISTENCE LAYER                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ PostgreSQL Database (Primary Datastore):                 │  │
│  │  • Organizations (multi-tenancy)                        │  │
│  │  • Users (admin, lecturer, student, staff)              │  │
│  │  • Departments                                          │  │
│  │  • Courses, Course Instructors                          │  │
│  │  • Enrollments                                          │  │
│  │  • Attendance Sessions (scheduled events)               │  │
│  │  • QR Tokens (short-lived, rotated)                     │  │
│  │  • Attendance Scans (raw submission attempts)           │  │
│  │  • Attendance Records (final status)                    │  │
│  │  • Refresh Tokens (for token rotation)                  │  │
│  │  • Audit Logs (compliance, change tracking)             │  │
│  │  • Notifications (message queue)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Redis Cache (Optional, Future):                          │  │
│  │  • Session cache                                        │  │
│  │  • Rate limiting state                                  │  │
│  │  • QR token rotation queue                              │  │
│  │  • Frequently accessed reports                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Object Storage / File System (Future):                   │  │
│  │  • Exported reports (PDF/CSV)                           │  │
│  │  • User profile photos                                  │  │
│  │  • System backups                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

        │ Scheduled Tasks (Celery/RQ)
        │
┌───────▼────────────────────────────────────────────────────────┐
│              ASYNC PROCESSING LAYER (Future)                   │
│                                                                 │
│  • Email sending (notifications, invites)                      │
│  • Report generation and export                                │
│  • QR token rotation (if server-side)                          │
│  • Data cleanup (old tokens, expired sessions)                 │
│  • Analytics aggregation                                       │
│  • Audit log archival                                          │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Directory Structure

```
app/
├── layout.tsx                 # Root layout (HTML structure)
├── page.tsx                   # Home page (redirect to role dashboard)
├── login/
│   └── page.tsx              # Login page
├── student/
│   ├── page.tsx              # Student dashboard
│   ├── scan/page.tsx         # QR scanner interface
│   ├── schedule/page.tsx     # Class schedule view
│   ├── history/page.tsx      # Attendance history
│   ├── notifications/page.tsx
│   └── settings/page.tsx
├── lecturer/
│   ├── page.tsx              # Lecturer dashboard
│   ├── generate/page.tsx     # QR code generation
│   ├── courses/page.tsx      # Course management
│   ├── analytics/page.tsx    # Session analytics
│   ├── notifications/page.tsx
│   └── settings/page.tsx
└── admin/
    ├── page.tsx              # Admin dashboard
    ├── users/page.tsx        # User management
    ├── courses/page.tsx      # Course administration
    ├── departments/page.tsx  # Department management
    ├── analytics/page.tsx    # System-wide analytics
    └── settings/page.tsx

components/
├── dashboard-layout.tsx      # Shared authenticated shell
├── theme-provider.tsx        # Theme context setup
└── ui/                       # 40+ UI components (shadcn/Radix)
    ├── button.tsx, card.tsx, table.tsx
    ├── dialog.tsx, drawer.tsx, sidebar.tsx
    ├── form.tsx, input.tsx, select.tsx
    ├── chart.tsx, toast.tsx, tabs.tsx
    └── ... (30+ more)

hooks/
├── use-mobile.ts            # Responsive hook
└── use-toast.ts             # Toast notification hook

lib/
├── auth-context.tsx         # Authentication state (mock)
├── mock-data.ts             # Sample data for development
└── utils.ts                 # Helper utilities

public/                       # Static assets
styles/
└── globals.css              # Global styles (Tailwind config)
```

### 2.2 Page Hierarchy & Navigation

```
/ (root)
├── Home (redirect based on user role)
│
├── /login
│   └── Login page (unauthenticated only)
│
├── /student (requires student role)
│   ├── Dashboard
│   ├── /scan (QR scanner)
│   ├── /schedule (Class schedule)
│   ├── /history (Attendance records)
│   ├── /notifications
│   └── /settings
│
├── /lecturer (requires lecturer role)
│   ├── Dashboard
│   ├── /generate (QR code generation)
│   ├── /courses (Course management)
│   ├── /analytics (Session reports)
│   ├── /notifications
│   └── /settings
│
└── /admin (requires admin role)
    ├── Dashboard
    ├── /users (User management)
    ├── /courses (Course admin)
    ├── /departments (Department admin)
    ├── /analytics (System analytics)
    └── /settings
```

### 2.3 State Management

**Current (Prototype):**
- `useAuth()` hook from `auth-context.tsx`
- localStorage for persistence
- Client-side only (mock data)

**Future (Production):**
- Replace context with server-side session tokens
- Move data fetching to API calls
- Implement React Query or SWR for caching
- Add error boundaries and Suspense
- Offline-first with service workers

### 2.4 Component Taxonomy

**Layout Components:**
- `DashboardLayout`: Top bar, sidebar, main content area
- `ThemeProvider`: Dark/light mode support

**Form Components:**
- `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Toggle`
- `FormField` (with validation display)

**Data Display:**
- `Table` (sortable, paginated)
- `Card` (data container)
- `Chart` (Recharts wrapper)
- `Badge`, `Avatar`, `Skeleton`

**Modals & Dialogs:**
- `Dialog`, `AlertDialog`, `Drawer`, `Sheet`
- `Popover`, `Tooltip`, `HoverCard`

**Navigation:**
- `Sidebar`, `Breadcrumb`, `Tabs`
- `NavigationMenu`, `Menubar`, `ContextMenu`

---

## 3. Backend Architecture

### 3.1 FastAPI Application Structure

```
app/
├── main.py                  # App factory, middleware setup
│
├── core/
│   ├── config.py            # Settings, environment variables
│   ├── security.py          # JWT, password hashing, permissions
│   ├── permissions.py       # Role-based access control
│   ├── exceptions.py        # Custom exception classes
│   ├── pagination.py        # Pagination helpers
│   └── logging.py           # Logging configuration
│
├── db/
│   ├── session.py           # SQLAlchemy session factory
│   ├── base.py              # Base model, declarative base
│   └── migrations/          # Alembic migrations (future)
│
├── models/                  # SQLAlchemy ORM models
│   ├── organization.py      # Organization entity
│   ├── user.py              # User entity + relationships
│   ├── department.py        # Department entity
│   ├── course.py            # Course + instructor assignments
│   ├── enrollment.py        # Student-course relationships
│   ├── attendance.py        # Sessions, records, scans
│   ├── qr.py                # QR tokens
│   ├── audit.py             # Audit log entries
│   └── notification.py      # Notification entities
│
├── schemas/                 # Pydantic request/response models
│   ├── auth.py              # LoginRequest, TokenResponse
│   ├── users.py             # UserCreate, UserUpdate
│   ├── courses.py           # CourseCreate, CourseResponse
│   ├── attendance.py        # ScanRequest, AttendanceResponse
│   ├── reports.py           # ReportRequest, ReportResponse
│   └── common.py            # Shared schemas (pagination, etc)
│
├── api/
│   ├── deps.py              # Dependency injection
│   └── v1/
│       ├── router.py        # Main router (includes all routers)
│       ├── auth.py          # Auth endpoints
│       ├── users.py         # User CRUD endpoints
│       ├── organizations.py # Org management
│       ├── departments.py   # Department management
│       ├── courses.py       # Course management
│       ├── enrollments.py   # Enrollment endpoints
│       ├── sessions.py      # Attendance session endpoints
│       ├── attendance.py    # QR scan + attendance endpoints
│       ├── reports.py       # Reporting endpoints
│       └── admin.py         # Admin-only endpoints
│
├── services/                # Business logic layer
│   ├── auth_service.py      # Authentication logic
│   ├── qr_service.py        # QR generation, validation
│   ├── attendance_service.py# Scan processing, rules
│   ├── report_service.py    # Analytics, aggregation
│   ├── notification_service.py # Message dispatch
│   ├── audit_service.py     # Change logging
│   └── email_service.py     # Email sending (future)
│
├── repositories/            # Data access patterns
│   ├── base.py              # Base repository (generic CRUD)
│   ├── users.py             # User queries
│   ├── courses.py           # Course queries
│   ├── attendance.py        # Attendance queries
│   └── audit.py             # Audit log queries
│
├── workers/                 # Background job tasks (Celery)
│   ├── tasks.py             # Job definitions
│   ├── email_tasks.py       # Email jobs
│   ├── export_tasks.py      # Report export jobs
│   └── cleanup_tasks.py     # Data cleanup jobs
│
├── middleware/              # Custom middleware
│   ├── cors.py              # CORS configuration
│   ├── logging.py           # Request logging
│   └── error_handler.py     # Exception handling
│
└── tests/
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    └── conftest.py          # Pytest fixtures
```

### 3.2 Request/Response Flow

```
HTTP Request
    ↓
[CORS Middleware] - Validate origin
    ↓
[Logging Middleware] - Log request details
    ↓
FastAPI Router - Route to endpoint
    ↓
[JWT Validation] - Extract & verify token
    ↓
[Role-Based Access Control] - Check permissions
    ↓
Request Handler (API endpoint)
    ├─→ Validate request schema (Pydantic)
    ├─→ Call service layer (business logic)
    │   └─→ Call repository layer (data access)
    │       └─→ Execute SQL via SQLAlchemy
    │           └─→ PostgreSQL
    ├─→ Format response (Pydantic schema)
    └─→ Return JSON response
    ↓
HTTP Response
```

### 3.3 Authentication & Authorization Flow

```
┌─────────────────────────────┐
│ User Credentials (email/pwd)│
└──────────────┬──────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│ POST /api/v1/auth/login             │
│ - Validate email format             │
│ - Query user from database          │
│ - Verify password hash (bcrypt)     │
│ - Check user is active & verified   │
└──────────────┬──────────────────────┘
               │
               ├─→ Success
               │   │
               │   ├─→ Create JWT access token (expires 30min)
               │   ├─→ Create refresh token (expires 7 days)
               │   ├─→ Store refresh token hash in DB
               │   └─→ Return tokens to client
               │
               └─→ Failure
                   └─→ Return 401 Unauthorized

┌──────────────────────────────┐
│ Client Stores Tokens         │
│ - Access token (in memory)   │
│ - Refresh token (secure)     │
└─────────────┬────────────────┘
              │
              ↓
┌──────────────────────────────────────┐
│ Subsequent Requests                  │
│ Authorization: Bearer <access_token> │
└──────────────┬───────────────────────┘
               │
               ↓
┌──────────────────────────┐
│ JWT Middleware           │
│ - Decode token           │
│ - Verify signature       │
│ - Check expiration       │
│ - Extract claims (sub,   │
│   org_id, role)          │
└──────────────┬───────────┘
               │
               ├─→ Valid
               │   └─→ Attach user to request
               │
               └─→ Invalid/Expired
                   └─→ Check for refresh token
                       ├─→ Refresh token valid
                       │   └─→ Issue new access token
                       └─→ Refresh expired
                           └─→ Return 401 (redirect to login)
```

### 3.4 Attendance Scanning Flow

```
┌──────────────────────────┐
│ Student Scans QR Code    │
└──────────────┬───────────┘
               │
               ↓
┌────────────────────────────────┐
│ POST /api/v1/attendance/scan   │
│ Request body: QR token payload │
└────────────────┬───────────────┘
                 │
                 ↓
┌─────────────────────────────────────┐
│ AttendanceService.process_scan()    │
│ - Verify user authenticated         │
│ - Parse QR token                    │
│ - Validate token:                   │
│   ✓ Signature matches               │
│   ✓ Token not expired               │
│   ✓ Session still active            │
│ - Query session from DB             │
│ - Verify student enrolled in course │
│ - Check for duplicate scans         │
│ - Validate geofencing (if required) │
│ - Validate device (if required)     │
└──────────────┬──────────────────────┘
               │
               ├─→ All checks pass
               │   │
               │   ├─→ Calculate attendance status
               │   │   (present, late, etc)
               │   │
               │   ├─→ Create attendance_scans row
               │   │   (record raw attempt)
               │   │
               │   ├─→ Create/update attendance_records
               │   │   (final status)
               │   │
               │   ├─→ Log to audit_logs
               │   │
               │   └─→ Return 200 OK with status
               │
               └─→ Validation fails
                   ├─→ Duplicate scan → 409 Conflict
                   ├─→ Expired token → 401 Unauthorized
                   ├─→ Session inactive → 422 Unprocessable
                   ├─→ Not enrolled → 403 Forbidden
                   ├─→ Outside geofence → 422 Unprocessable
                   └─→ Device rejected → 403 Forbidden
```

---

## 4. Database Architecture

### 4.1 Entity Relationship Diagram (Simplified)

```
┌─────────────────┐
│ organizations   │
│ - id (PK)       │
│ - name          │
│ - slug (unique) │
│ - timezone      │
└────────┬────────┘
         │ 1:N
         │
    ┌────┴───────────────────┬──────────────────┐
    │                        │                  │
    ↓                        ↓                  ↓
┌─────────────┐      ┌──────────────┐   ┌──────────────┐
│ departments │      │    users     │   │   courses    │
│ - id (PK)   │      │ - id (PK)    │   │ - id (PK)    │
│ - name      │      │ - email      │   │ - code       │
│ - org_id(FK)│      │ - role       │   │ - title      │
└─────────────┘      │ - org_id(FK) │   │ - org_id(FK) │
                     │ - dept_id(FK)│   │ - dept_id(FK)│
                     └──────┬───────┘   └──────┬───────┘
                            │                  │
                            │ 1:N             │ N:M
                            │                  │
                    ┌───────┴────────┐    ┌────┴───────────────┐
                    │                │    │                    │
                    ↓                ↓    ↓                    ↓
            ┌──────────────┐   ┌──────────────────┐   ┌─────────────────┐
            │ enrollments  │   │ course_instructors
            │ - id (PK)    │   │ - course_id (FK) │
            │ - course_id  │   │ - instructor_id  │
            │ - student_id │   └──────────────────┘
            │ - is_active  │
            └──────────────┘

┌─────────────────────────┐
│ attendance_sessions     │
│ - id (PK)               │
│ - course_id (FK)        │
│ - created_by (FK)       │
│ - title                 │
│ - status                │
│ - starts_at             │
│ - ends_at               │
└──────┬──────────────────┘
       │
       ├──────1:N─→ ┌────────────────────┐
       │            │ qr_tokens          │
       │            │ - id (PK)          │
       │            │ - session_id (FK)  │
       │            │ - token_hash       │
       │            │ - expires_at       │
       │            └────────────────────┘
       │
       ├──────1:N─→ ┌────────────────────┐
       │            │ attendance_scans   │
       │            │ - id (PK)          │
       │            │ - session_id (FK)  │
       │            │ - student_id (FK)  │
       │            │ - status           │
       │            │ - scanned_at       │
       │            └────────────────────┘
       │
       └──────1:N─→ ┌─────────────────────┐
                    │ attendance_records  │
                    │ - id (PK)           │
                    │ - session_id (FK)   │
                    │ - student_id (FK)   │
                    │ - status            │
                    │ - marked_at         │
                    │ - is_manual         │
                    └─────────────────────┘

┌────────────────┐
│ refresh_tokens │
│ - id (PK)      │
│ - user_id (FK) │
│ - token_hash   │
│ - expires_at   │
│ - revoked_at   │
└────────────────┘

┌────────────────┐
│ audit_logs     │
│ - id (PK)      │
│ - user_id (FK) │
│ - action       │
│ - entity_type  │
│ - entity_id    │
│ - changes      │
│ - created_at   │
└────────────────┘
```

### 4.2 Key Data Models

**Organization (Multi-tenancy)**
- Represents a university/school
- Contains departments, users, courses
- Timezone, active status

**User (Polymorphic via role)**
- Student: matric_no, enrollment relationships
- Lecturer: assigned courses
- Admin: system-wide permissions
- Staff: read-only access

**Course**
- Academic context (department, year, term)
- Multiple instructors
- Multiple enrolled students
- Multiple attendance sessions

**Enrollment**
- Links student to course
- Active/dropped status
- Enrollment date

**Attendance Session**
- Scheduled attendance event
- QR configuration (rotation, expiry)
- Geofencing/device requirements
- Session status lifecycle

**QR Token**
- Short-lived token for session
- Hash stored for security
- Expiration and revocation tracking

**Attendance Scan**
- Raw submission attempt
- Prevents duplicate detection
- Supports fraud investigation

**Attendance Record**
- Final status for student in session
- One record per student per session
- Manual or automatic marking

---

## 5. API Endpoints Overview

### 5.1 Authentication Endpoints

```
POST /api/v1/auth/register
  Request: { email, password, role, first_name, last_name, ... }
  Response: { access_token, refresh_token, user: {...} }

POST /api/v1/auth/login
  Request: { email, password }
  Response: { access_token, refresh_token, user: {...} }

POST /api/v1/auth/refresh
  Request: { refresh_token }
  Response: { access_token, refresh_token }

POST /api/v1/auth/logout
  Request: (none, uses auth header)
  Response: { message: "Successfully logged out" }

GET /api/v1/auth/me
  Request: (none, uses auth header)
  Response: { user: {...}, permissions: [...] }
```

### 5.2 User Endpoints

```
GET /api/v1/users (admin only)
  Response: List[User]

GET /api/v1/users/{user_id}
  Response: User

POST /api/v1/users (admin only)
  Request: UserCreate
  Response: User

PUT /api/v1/users/{user_id} (user or admin)
  Request: UserUpdate
  Response: User

DELETE /api/v1/users/{user_id} (admin only)
  Response: { message: "Deleted" }
```

### 5.3 Course Endpoints

```
GET /api/v1/courses (paginated)
  Response: Page[Course]

GET /api/v1/courses/{course_id}
  Response: Course

POST /api/v1/courses (admin/lecturer)
  Request: CourseCreate
  Response: Course

PUT /api/v1/courses/{course_id}
  Request: CourseUpdate
  Response: Course

GET /api/v1/courses/{course_id}/enrollments
  Response: List[Enrollment]

POST /api/v1/courses/{course_id}/enroll
  Request: { student_id }
  Response: Enrollment
```

### 5.4 Attendance Endpoints

```
POST /api/v1/sessions
  Request: SessionCreate
  Response: AttendanceSession

GET /api/v1/sessions/{session_id}
  Response: AttendanceSession with metadata

POST /api/v1/sessions/{session_id}/start
  Request: (none)
  Response: AttendanceSession (status: active)

POST /api/v1/sessions/{session_id}/close
  Request: (none)
  Response: AttendanceSession (status: closed)

GET /api/v1/sessions/{session_id}/qr-token
  Response: { qr_data, expires_at, token_id }

POST /api/v1/attendance/scan
  Request: { qr_payload }
  Response: { status: "present" | "late" | ... }

GET /api/v1/attendance/history
  Response: List[AttendanceRecord]

POST /api/v1/attendance/mark-manual
  Request: { session_id, student_id, status, reason }
  Response: AttendanceRecord
```

### 5.5 Reporting Endpoints

```
GET /api/v1/reports/attendance/student/{student_id}
  Params: date_from, date_to, course_id
  Response: StudentAttendanceReport

GET /api/v1/reports/attendance/course/{course_id}
  Params: date_from, date_to
  Response: CourseAttendanceReport

GET /api/v1/reports/attendance/department/{department_id}
  Params: date_from, date_to
  Response: DepartmentAttendanceReport

POST /api/v1/reports/export
  Request: { report_type, filters, format: "pdf" | "csv" }
  Response: Job ID or direct download
```

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

```
Login
  ├─→ Password hashed with Argon2/bcrypt
  ├─→ Verified against stored hash
  └─→ JWT tokens issued

Access Token
  ├─→ Short-lived (30 minutes default)
  ├─→ Claims: sub (user_id), org_id, role, token_type, exp
  ├─→ Signed with HS256
  └─→ Sent in Authorization header

Refresh Token
  ├─→ Long-lived (7 days default)
  ├─→ Stored server-side (hashed)
  ├─→ Rotated on use (token rotation)
  ├─→ Can be revoked on logout
  └─→ Stored in secure HTTP-only cookie (future)

Role-Based Access Control (RBAC)
  ├─→ admin: Full system access
  ├─→ lecturer: Course and session management
  ├─→ student: View own data, scan QR
  └─→ staff: Read-only reports
```

### 6.2 QR Security

```
QR Token Generation
  ├─→ Unique nonce generated per token
  ├─→ Token signed with server secret
  ├─→ Hash stored in database (not plaintext)
  ├─→ TTL: 30-60 seconds (configurable)
  └─→ Session-specific (cannot be reused)

QR Validation During Scan
  ├─→ Signature verification
  ├─→ Expiration check
  ├─→ Nonce uniqueness check (prevent replay)
  ├─→ Enrollment verification
  ├─→ Session activity check
  ├─→ Location verification (if enabled)
  └─→ Device verification (if enabled)

Rotation Strategy
  ├─→ Previous token revoked
  ├─→ New token issued
  ├─→ Frontend refreshes QR display
  └─→ Reduces replay window
```

### 6.3 Data Protection

```
Sensitive Data
  ├─→ Passwords: Hashed with bcrypt (10+ rounds)
  ├─→ Tokens: Hashed before storage
  ├─→ API Keys: Not used yet, future strategy TBD
  ├─→ Email: Stored plaintext (consider hashing for users list)
  └─→ Personal Info: Encrypted at-rest (future)

Transport Security
  ├─→ HTTPS/TLS only (enforced in production)
  ├─→ HSTS headers (future)
  ├─→ CSP headers (future)
  ├─→ CORS restricted by origin
  └─→ Rate limiting (future)

Database Security
  ├─→ Parameterized queries (SQLAlchemy prevents SQL injection)
  ├─→ Connection pooling with credentials in environment
  ├─→ Row-level security via application logic (future: RLS)
  └─→ Audit logging for sensitive operations
```

---

## 7. Deployment Architecture (Target)

```
┌─────────────────────────────────────┐
│        Users (Browser)              │
│  (Student / Lecturer / Admin)       │
└──────────────────┬──────────────────┘
                   │
                   │ HTTPS
                   │
┌──────────────────▼──────────────────┐
│         CDN (CloudFront)            │
│    • Static files caching           │
│    • Global distribution            │
│    • DDoS protection                │
└──────────────────┬──────────────────┘
                   │
                   │
┌──────────────────▼──────────────────┐
│      Load Balancer (ALB)            │
│    • HTTPS termination              │
│    • SSL/TLS certificates           │
│    • Route based on path/host       │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ↓             ↓
   ┌────────────┐  ┌────────────┐
   │ Frontend   │  │  Backend   │
   │  (Next.js) │  │ (FastAPI)  │
   │ Container  │  │ Container  │
   │ #1         │  │ #1         │
   └────────────┘  └────────────┘
        │             │
        ├─────┬───────┤
        │     │       │
        ↓     ↓       ↓
   ┌────────────┐  ┌────────────┐
   │ Frontend   │  │  Backend   │
   │  (Next.js) │  │ (FastAPI)  │
   │ Container  │  │ Container  │
   │ #2         │  │ #2         │
   └────────────┘  └────────────┘
        │             │
        ├─────┬───────┤
        │     │       │
        ↓     ↓       ↓
   ┌────────────┐  ┌────────────┐
   │ Frontend   │  │  Backend   │
   │  (Next.js) │  │ (FastAPI)  │
   │ Container  │  │ Container  │
   │ #3         │  │ #3         │
   └────────────┘  └────────────┘
                   │
                   │ Connection pooling
                   │
        ┌──────────▼────────────┐
        │   RDS PostgreSQL      │
        │   • Multi-AZ          │
        │   • Automated backups │
        │   • Encryption        │
        └───────────────────────┘
                   │
                   ├─→ ┌──────────────┐
                   │   │ S3 Backups   │
                   │   └──────────────┘
                   │
                   └─→ ┌──────────────┐
                       │ CloudWatch   │
                       │ Logs         │
                       └──────────────┘

┌────────────────────────────────────┐
│  ElastiCache (Redis) - Optional    │
│  • Session cache                   │
│  • Rate limiting                   │
│  • QR token queue                  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  SQS/SNS - Message Queue           │
│  • Background jobs (email, export) │
│  • Notifications                   │
└────────────────────────────────────┘
```

---

## 8. Scaling Considerations

### 8.1 Horizontal Scaling
- Stateless FastAPI backend (scale container replicas)
- Next.js frontend on CDN
- Database connection pooling (PgBouncer, RDS proxy)
- Redis for distributed caching

### 8.2 Vertical Scaling
- Increase FastAPI server resources for compute-heavy operations
- Increase PostgreSQL instance size for large datasets
- More CPU for crypto operations (JWT signing, password hashing)

### 8.3 Data Optimization
- Index on `attendance_sessions.status` and `qr_tokens.expires_at`
- Partitioning `attendance_records` by course or date range
- Archival of old audit logs to cold storage
- Pagination on all list endpoints

### 8.4 Performance Targets
- API response time: < 200ms (p95)
- QR scan processing: < 500ms
- Concurrent users: 1000+
- Database query time: < 50ms (p95)

---

## 9. Observability & Monitoring

### 9.1 Logging
- Request/response logging (middleware)
- Application error logging (with stack traces)
- Audit logging (auth events, data changes)
- QR scan attempt logging (for fraud detection)

### 9.2 Metrics
- API endpoint response times
- Error rates by endpoint
- Database query performance
- QR token generation/validation rates
- Concurrent session count

### 9.3 Alerting
- High error rates (> 5%)
- Slow database queries (> 1000ms)
- Service unavailability
- Suspicious QR scanning patterns
- Failed login attempts

### 9.4 Tracing
- Request ID propagation
- Distributed tracing (OpenTelemetry)
- Service-to-database tracing

---

## 10. Future Architectural Enhancements

1. **Microservices:** Split into auth, attendance, reporting services
2. **GraphQL API:** Alternative to REST for complex queries
3. **WebSocket:** Real-time notifications and live updates
4. **Mobile Apps:** Native iOS/Android clients
5. **AI/ML:** Anomaly detection in attendance patterns
6. **Event Sourcing:** Audit trail as event log
7. **CQRS:** Separate read/write models for reports
8. **Blockchain:** Immutable attendance records (optional)

