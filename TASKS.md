# Development Roadmap

This roadmap turns the current QR Attend prototype into a production-ready QR Attendance Management System. Each phase should finish with working API integration, passing tests, and the frontend no longer depending on mock data for that feature area.

## Phase 1: Authentication

Goal: Replace demo/localStorage role selection with real authentication, sessions, and role-based access.

### Backend Tasks

- [ ] Choose backend implementation stack: FastAPI + PostgreSQL, or a TypeScript backend if the project should stay JavaScript-first.
- [ ] Create backend project structure with config, API router, services, repositories, schemas, and tests.
- [ ] Implement user model fields needed for auth: email, password hash, role, active status, verification status, organization/department references.
- [ ] Implement password hashing with Argon2 or bcrypt.
- [ ] Implement `POST /auth/login`.
- [ ] Implement `POST /auth/refresh` with refresh-token rotation.
- [ ] Implement `POST /auth/logout` with refresh-token revocation.
- [ ] Implement `GET /auth/me`.
- [ ] Implement role-based authorization middleware/dependencies for `student`, `lecturer`, `admin`, and optional `staff`.
- [ ] Add login rate limiting.
- [ ] Add auth tests for valid login, invalid password, inactive users, refresh, logout, and role access.

### Frontend Tasks

- [ ] Replace `lib/auth-context.tsx` mock login with real API calls.
- [ ] Store tokens securely according to chosen auth strategy.
- [ ] Load current user from `GET /auth/me`.
- [ ] Replace role-tab demo login behavior with credential-based routing.
- [ ] Add authenticated route protection for student, lecturer, and admin pages.
- [ ] Add loading, error, logout, expired-session, and refresh-session states.
- [ ] Remove demo text from `/login`.

### Exit Criteria

- [ ] Users can log in with real credentials.
- [ ] Users are routed by server-provided role.
- [ ] Protected pages reject unauthenticated and wrong-role users.
- [ ] Demo auth and role-tab-based identity selection are removed.

## Phase 2: Database

Goal: Move from mock data to a normalized, queryable PostgreSQL data model.

### Backend Tasks

- [ ] Set up PostgreSQL locally and define environment variables.
- [ ] Add database connection management.
- [ ] Add migration tooling.
- [ ] Align role naming across frontend, backend, and schema. Recommended roles: `admin`, `lecturer`, `student`, `staff`.
- [ ] Create migrations for organizations, departments, users, courses, lecturer assignments, enrollments, attendance sessions, QR tokens, attendance scans, attendance records, notifications, reports, and audit logs.
- [ ] Convert or adapt `database_schema.sql` into migrations.
- [ ] Add seed data for one organization, departments, admin, lecturers, students, courses, schedules, and enrollments.
- [ ] Add repository/service methods for users, departments, courses, enrollments, sessions, and attendance.
- [ ] Add database constraints for unique emails, course codes, enrollments, and one attendance record per student per session.
- [ ] Add soft-delete or active/inactive handling where appropriate.

### Frontend Tasks

- [ ] Create typed API client helpers.
- [ ] Replace `lib/mock-data.ts` reads with API-backed data loading.
- [ ] Add loading and empty states for dashboard cards, schedules, courses, history, and notifications.
- [ ] Decide whether to use SWR or TanStack Query for API caching and mutation invalidation.

### Exit Criteria

- [ ] Application data loads from PostgreSQL-backed APIs.
- [ ] Mock data is no longer used for authenticated production flows.
- [ ] Seeded users can see their real courses, schedules, and attendance records.

## Phase 3: QR Generation

Goal: Make lecturer QR generation secure, session-based, and backend-controlled.

### Backend Tasks

- [ ] Implement attendance session model and service.
- [ ] Implement `POST /courses/{course_id}/sessions`.
- [ ] Implement `POST /sessions/{session_id}/start`.
- [ ] Implement `POST /sessions/{session_id}/close`.
- [ ] Implement QR token generation using cryptographically secure random values.
- [ ] Store only hashed QR token values in the database.
- [ ] Implement `GET /sessions/{session_id}/qr/current`.
- [ ] Implement `POST /sessions/{session_id}/qr/rotate`.
- [ ] Add token expiration and rotation rules.
- [ ] Verify lecturer can only create sessions for assigned courses.
- [ ] Add audit logs for session start, close, and QR rotation.
- [ ] Add tests for token expiry, rotation, lecturer permissions, and session status transitions.

### Frontend Tasks

- [ ] Replace client-side QR string generation in `/lecturer/generate` with backend session creation.
- [ ] Display backend-issued QR payload using `qrcode.react`.
- [ ] Add start session, close session, refresh/rotate QR, and session status UI.
- [ ] Replace mock countdown with backend token expiration time.
- [ ] Replace mock live attendance cards with backend session attendance summary.
- [ ] Handle expired QR, closed session, network failure, and unauthorized lecturer states.

### Exit Criteria

- [ ] Lecturers can create/start/close attendance sessions.
- [ ] QR codes come from backend-issued tokens.
- [ ] QR tokens expire or rotate according to backend rules.
- [ ] QR values are not stored in plaintext.

## Phase 4: QR Scanning

Goal: Decode real QR codes from the camera and submit them to the backend for validation.

### Backend Tasks

- [ ] Implement `POST /attendance/scan`.
- [ ] Validate authenticated user is a student.
- [ ] Validate QR token exists, is active, and has not expired.
- [ ] Validate attendance session is active.
- [ ] Validate student is enrolled in the session course.
- [ ] Detect duplicate scans.
- [ ] Record every scan attempt in `attendance_scans`, including accepted and rejected attempts.
- [ ] Return clear scan outcomes: accepted, duplicate, expired token, invalid token, not enrolled, inactive session.
- [ ] Add optional request metadata: IP address, user agent, location, device fingerprint.
- [ ] Add rate limiting for scan endpoint.
- [ ] Add tests for all scan outcomes.

### Frontend Tasks

- [ ] Replace simulated scan timeout in `/student/scan` with real QR decoding using ZXing.
- [ ] Submit decoded QR token to `POST /attendance/scan`.
- [ ] Show success, duplicate, expired, invalid, not enrolled, and inactive-session states.
- [ ] Add camera permission handling and browser compatibility messaging.
- [ ] Stop camera stream reliably on navigation, success, and error.
- [ ] Add manual paste/input fallback for QR payloads if camera access is unavailable.

### Exit Criteria

- [ ] Student camera scans decode actual QR codes.
- [ ] Scan result is determined by backend validation.
- [ ] Invalid and duplicate scans are stored for audit/security review.

## Phase 5: Attendance Recording

Goal: Convert accepted scans into durable attendance records with rules, overrides, and auditability.

### Backend Tasks

- [ ] Implement attendance record creation/update inside the scan flow.
- [ ] Apply `present` and `late` rules based on session start time and `late_after_minutes`.
- [ ] Automatically mark enrolled students as `absent` when sessions close.
- [ ] Implement `GET /sessions/{session_id}/attendance`.
- [ ] Implement `GET /me/attendance`.
- [ ] Implement `GET /students/{student_id}/attendance`.
- [ ] Implement lecturer/admin manual override endpoint.
- [ ] Require override reason/note for manual attendance changes.
- [ ] Write audit logs for every manual override.
- [ ] Prevent duplicate attendance records with database constraints.
- [ ] Add tests for scan-to-record, late status, absent generation, duplicate prevention, and overrides.

### Frontend Tasks

- [ ] Replace student history mock data with `GET /me/attendance`.
- [ ] Replace dashboard attendance percentages with backend values.
- [ ] Add lecturer session attendance roster.
- [ ] Add manual mark/override UI for lecturers where policy allows.
- [ ] Add status badges for present, late, absent, excused, and manual present.
- [ ] Add attendance refresh after successful scan.

### Exit Criteria

- [ ] Accepted scans create real attendance records.
- [ ] Attendance percentages reflect database records.
- [ ] Lecturers/admins can review and adjust attendance with audit trail.

## Phase 6: Analytics

Goal: Replace mock charts and random numbers with accurate attendance reporting.

### Backend Tasks

- [ ] Implement attendance summary aggregation by student, course, department, lecturer, date range, and session.
- [ ] Implement `GET /reports/attendance-summary`.
- [ ] Implement `GET /reports/course/{course_id}`.
- [ ] Implement `GET /reports/student/{student_id}`.
- [ ] Add filters for date range, course, department, status, lecturer, and student.
- [ ] Add export job support for CSV initially, then XLSX/PDF if needed.
- [ ] Implement `POST /reports/export`.
- [ ] Implement `GET /reports/exports/{export_id}`.
- [ ] Cache expensive analytics queries where appropriate.
- [ ] Add tests for summary accuracy and filter behavior.

### Frontend Tasks

- [ ] Replace `Math.random()` analytics data with API responses.
- [ ] Update admin analytics charts to use real department/course/student summaries.
- [ ] Update lecturer analytics charts to use real assigned-course attendance.
- [ ] Add date range and course/department filters connected to API.
- [ ] Add export buttons and export status/download UI.
- [ ] Add empty and loading states for charts.

### Exit Criteria

- [ ] Analytics pages show real attendance data.
- [ ] Reports can be filtered and exported.
- [ ] Dashboard totals match report totals.

## Phase 7: Admin Features

Goal: Turn admin pages from read-only mock screens into full system management tools.

### Backend Tasks

- [ ] Implement admin CRUD for users.
- [ ] Implement user activation/deactivation.
- [ ] Implement password reset or invite flow.
- [ ] Implement department CRUD.
- [ ] Implement course CRUD.
- [ ] Implement lecturer assignment endpoints.
- [ ] Implement student enrollment endpoints.
- [ ] Implement bulk import for users and enrollments.
- [ ] Implement admin audit log viewing.
- [ ] Implement organization-level attendance policies.
- [ ] Implement notification creation and delivery rules.
- [ ] Add tests for admin permissions and CRUD flows.

### Frontend Tasks

- [ ] Replace admin users mock list with API-backed table.
- [ ] Add create/edit/deactivate user dialogs or pages.
- [ ] Replace admin courses mock list with API-backed table.
- [ ] Add create/edit/archive course flows.
- [ ] Replace admin departments mock list with API-backed table.
- [ ] Add lecturer assignment and enrollment management UI.
- [ ] Add bulk import UI with validation preview.
- [ ] Add admin audit log page.
- [ ] Add notification management UI if notifications remain in scope.
- [ ] Add pagination, sorting, search, and filters to admin tables.

### Exit Criteria

- [ ] Admins can manage users, departments, courses, lecturer assignments, and enrollments.
- [ ] Admin actions are permission-checked and audited.
- [ ] Admin tables use real data with pagination/search/filtering.

## Cross-Phase Engineering Tasks

- [ ] Rename package from `my-project` to `qr-attend` or `qr-attendance`.
- [ ] Choose one package manager and remove the unused lockfile.
- [ ] Remove or update `generator: 'v0.app'` metadata.
- [ ] Fix mojibake text such as `â€¢`.
- [ ] Remove `typescript.ignoreBuildErrors: true` after type errors are fixed.
- [ ] Add environment variable documentation.
- [ ] Add automated tests for backend services and frontend critical flows.
- [ ] Add CI workflow for lint, type-check, test, and build.
- [ ] Add error monitoring and structured logging.
- [ ] Add deployment plan for frontend, backend, database, and Redis.

