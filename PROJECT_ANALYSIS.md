# QR Attendance Management System - Project Analysis

**Last Updated:** June 2026  
**Project Status:** Prototype (Phase 1 - Authentication in Progress)

## Executive Summary

QR Attend is a comprehensive university attendance management system designed to streamline the attendance tracking process through QR code scanning. The system replaces manual roll calls with a secure, automated, and auditable digital solution supporting multiple user roles (admin, lecturer, student, staff) across an organization.

### Current State
- **Frontend:** 90% UI component library complete; authentication and data integration pending
- **Backend:** API structure scaffolded with authentication endpoints; database models defined
- **Database:** Full schema designed but not yet deployed
- **Architecture:** Multi-tier SPA with FastAPI backend and PostgreSQL persistence

---

## 1. Project Overview

### Purpose
Enable universities and educational institutions to:
1. Track student attendance efficiently using QR codes
2. Generate detailed attendance reports and analytics
3. Manage courses, enrollments, and attendance sessions
4. Support multiple organizational units (departments, faculties)
5. Maintain audit trails for compliance and fraud prevention

### Key Value Propositions
- **Fast & Accurate:** QR scanning eliminates manual entry errors
- **Secure:** Rotating QR tokens and server-side validation prevent fraud
- **Flexible:** Supports optional geofencing, device verification, and manual overrides
- **Scalable:** Multi-organization architecture with department-level management
- **Auditable:** Complete audit logs for attendance changes and system actions

---

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI Library:** shadcn/ui (Radix UI primitives + Tailwind CSS)
- **State Management:** React Context API (`auth-context.tsx`)
- **HTTP Client:** Built-in fetch (no external client yet)
- **QR Scanning:** @zxing/browser, @zxing/library
- **QR Generation:** qrcode or server-rendered
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts (via chart.tsx component)
- **Notifications:** Sonner toast system
- **CSS:** Tailwind CSS with CSS variables

### Backend
- **Framework:** FastAPI 0.115+
- **Language:** Python 3.9+
- **Server:** Uvicorn with Gunicorn for production
- **ORM:** SQLAlchemy 2.0+
- **Database Driver:** psycopg[binary] 3.2+
- **Validation:** Pydantic v2
- **Auth:** Python-Jose (JWT) + Passlib (bcrypt)
- **Email Validation:** email-validator
- **Configuration:** Pydantic Settings

### Database
- **System:** PostgreSQL 15+
- **Extensions:** pgcrypto, citext
- **Connection Pooling:** SQLAlchemy connection management

### Infrastructure (Planned)
- **Deployment:** Docker containers (not yet configured)
- **Cache/Queue:** Redis (not yet integrated)
- **Background Jobs:** Celery/RQ/Arq (not yet integrated)
- **Object Storage:** S3-compatible (not yet integrated)

---

## 3. Project Structure

```
QR Attendance/
├── frontend (Next.js)
│   ├── app/
│   │   ├── layout.tsx (Root layout)
│   │   ├── page.tsx (Home redirect)
│   │   ├── login/page.tsx (Login page)
│   │   ├── student/
│   │   │   ├── page.tsx (Student dashboard)
│   │   │   ├── scan/page.tsx (QR scanner)
│   │   │   ├── schedule/page.tsx (Class schedule)
│   │   │   ├── history/page.tsx (Attendance records)
│   │   │   ├── notifications/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── lecturer/
│   │   │   ├── page.tsx (Lecturer dashboard)
│   │   │   ├── generate/page.tsx (QR generation)
│   │   │   ├── courses/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── admin/
│   │       ├── page.tsx (Admin dashboard)
│   │       ├── users/page.tsx
│   │       ├── courses/page.tsx
│   │       ├── departments/page.tsx
│   │       ├── analytics/page.tsx
│   │       └── settings/page.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth-context.tsx (Mock auth)
│   │   ├── mock-data.ts
│   │   └── utils.ts
│   ├── public/
│   └── styles/
│
├── backend (FastAPI)
│   ├── app/
│   │   ├── main.py (App factory)
│   │   ├── core/ (config, security, permissions)
│   │   ├── db/ (session, base models)
│   │   ├── models/ (ORM entities)
│   │   ├── schemas/ (Pydantic validation)
│   │   ├── api/v1/ (HTTP endpoints)
│   │   ├── services/ (business logic)
│   │   ├── repositories/ (data access)
│   │   ├── workers/ (background jobs)
│   │   └── tests/
│   ├── requirements.txt
│   └── README.md
│
└── documentation/
    ├── DATABASE_SCHEMA.md
    ├── SYSTEM_ARCHITECTURE.md
    ├── DEVELOPMENT_ROADMAP.md
    └── PROJECT_ANALYSIS.md
```

### Key Components

- `app/`: Route pages using Next.js App Router
- `components/dashboard-layout.tsx`: Shared authenticated shell
- `components/ui/`: 40+ shadcn/Radix components
- `lib/auth-context.tsx`: Authentication state management
- `lib/mock-data.ts`: Mock users, courses, attendance data
- `backend/app/`: FastAPI application structure
- `database_schema.sql`: PostgreSQL schema definition

---

## 4. Current Development Status

### ✅ Completed
- [x] UI component library (40+ components)
- [x] Dashboard layouts and navigation
- [x] Mock data structure and selectors
- [x] Page routing and role-based navigation
- [x] Database schema design
- [x] Backend API structure scaffolding
- [x] Authentication concepts and flow design

### 🚧 In Progress (Phase 1 - Authentication)
- [ ] Real authentication API endpoints
- [ ] JWT token generation and validation
- [ ] Password hashing and verification
- [ ] Refresh token management
- [ ] Role-based authorization middleware
- [ ] Frontend authentication integration
- [ ] Protected route implementation

### 📋 Not Started (Future Phases)
- [ ] Database connection and migrations (Phase 2)
- [ ] Course and enrollment management (Phase 3)
- [ ] Attendance session management (Phase 4)
- [ ] QR generation and scanning (Phase 5)
- [ ] Reporting and export features (Phase 6)
- [ ] Background jobs (Phase 7)
- [ ] Notifications system (Phase 8)
- [ ] Deployment and DevOps (Phase 9)

---

## 5. Component Inventory

### UI Components (40+)
- **Layout:** Accordion, Alert Dialog, Card, Drawer, Sidebar, Sheet
- **Forms:** Button, Checkbox, Input, Input Group, Label, Radio Group, Select, Textarea, Toggle
- **Data Display:** Badge, Breadcrumb, Calendar, Carousel, Chart, Command, Pagination, Table
- **Feedback:** Alert, Dialog, Popover, Tooltip, Toast, Sonner
- **Navigation:** Dropdown Menu, Menubar, Navigation Menu, Context Menu
- **Utilities:** Avatar, Empty State, Skeleton, Spinner

### Custom Components
- `DashboardLayout`: Shared authenticated shell with sidebar, top bar, theme toggle
- `ThemeProvider`: Theme context setup

---

## 6. Frontend Architecture

### Layers
1. **Pages** (`app/`): Route handlers returning layout + content
2. **Components** (`components/`): Reusable UI and domain components
3. **Hooks** (`hooks/`): Custom React hooks
4. **Context** (`lib/auth-context.tsx`): Application state
5. **Utilities** (`lib/utils.ts`, `lib/mock-data.ts`): Helpers and mock data

### Styling
- **CSS Framework:** Tailwind CSS with CSS variables
- **Component Library:** shadcn/ui (Radix UI + Tailwind presets)
- **Theming:** Dark/light mode with theme provider

### State Management (Current)
- **Client-side Context:** `useAuth()` from `auth-context.tsx`
- **Browser Storage:** localStorage for user session (mock)
- **Future:** Replace with server-side sessions

---

## 7. Backend Architecture

### Layers
1. **API Routes** (`api/v1/`): HTTP endpoint handlers
2. **Services** (`services/`): Business logic
3. **Repositories** (`repositories/`): Data access patterns
4. **Models** (`models/`): SQLAlchemy ORM definitions
5. **Schemas** (`schemas/`): Pydantic request/response validation
6. **Database** (`db/`): Connection and session management

### Authentication Flow
```
User Credentials
    ↓
login endpoint
    ↓
Verify email + password hash
    ↓
Create JWT access token + refresh token
    ↓
Return tokens to client
    ↓
Client stores tokens
    ↓
Client sends access token in Authorization header
    ↓
Verify JWT + role
    ↓
Route to endpoint or reject
```

---

## 8. Known Issues & Limitations

### Frontend
- Mock authentication context depends on localStorage
- No real backend integration yet
- No error boundaries or offline handling
- No input validation on forms (mock data only)
- QR scanning requires actual implementation

### Backend
- Database not yet deployed
- Migrations not set up (Alembic pending)
- Limited error handling and logging
- No rate limiting or request throttling
- No email verification or password reset flow
- Notification system not implemented
- Background job system not configured

### Database
- Schema defined but not deployed
- No data seeding scripts
- No backup/recovery strategy
- No audit log cleanup policies

---

## 9. Dependencies Summary

### Frontend Dependencies (30+)
- **Core:** next, react, react-dom
- **UI:** @radix-ui/*, tailwindcss, clsx, class-variance-authority
- **Forms:** react-hook-form, zod, @hookform/resolvers
- **Data:** recharts, date-fns, embla-carousel
- **QR:** @zxing/browser, @zxing/library
- **Utilities:** lucide-react, cmdk, sonner
- **Analytics:** @vercel/analytics

### Backend Dependencies (10)
- **Core:** fastapi, uvicorn[standard]
- **Database:** SQLAlchemy, psycopg[binary]
- **Validation:** pydantic, pydantic-settings
- **Auth:** python-jose[cryptography], passlib[bcrypt]
- **Utils:** email-validator, python-multipart

---

## 10. Development Environment

### Required Tools
- Node.js 18+ (frontend)
- Python 3.9+ (backend)
- PostgreSQL 15+ (database)
- pnpm or npm (package management)
- Git

### Setup Commands

**Frontend:**
```bash
cd QR\ attendance
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# Runs on http://127.0.0.1:8000
# Swagger docs at http://127.0.0.1:8000/docs
```

---

## 11. Next Steps (Immediate)

1. **Phase 1 (In Progress):** Complete authentication endpoints and integrate with frontend
2. **Phase 2:** Deploy PostgreSQL and implement database migrations
3. **Phase 3:** Build course and enrollment APIs
4. **Phase 4:** Implement attendance session management
5. **Phase 5:** Develop QR token generation and scanning
6. **Phase 6:** Create reporting and export features
7. **Phase 7:** Set up background job system
8. **Phase 8:** Implement notifications
9. **Phase 9:** Deploy and monitor

---

## 12. Success Metrics

- [ ] Authentication fully functional
- [ ] All endpoints integrated with frontend
- [ ] Database deployed and optimized
- [ ] 95%+ test coverage
- [ ] API response time < 200ms (p95)
- [ ] Support 1000+ concurrent users
- [ ] Zero data loss in audit trails
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Production deployment successful

---

## 13. Related Documentation

- **System Architecture:** `SYSTEM_ARCHITECTURE.md`
- **Database Schema:** `DATABASE_SCHEMA.md`
- **Development Roadmap:** `DEVELOPMENT_ROADMAP.md`
- **Backend Architecture:** `backend_architecture.md`
- **Task List:** `TASKS.md`

## 2. Existing Pages

### Public Routes

- `/`: Redirect/loading page. Sends authenticated users to `/{role}` and unauthenticated users to `/login`.
- `/login`: Role-tabbed login page for student, lecturer, and admin. Demo auth accepts any email and a password of 4+ characters.

### Student Routes

- `/student`: Student dashboard with quick actions, overall attendance, today's classes, enrolled courses, recent attendance, and course attendance percentages.
- `/student/scan`: Camera-based scan UI. It requests camera access, then simulates a successful scan after 3 seconds. It does not decode real QR codes or save attendance.
- `/student/schedule`: Weekly schedule from mock course schedules.
- `/student/history`: Attendance history with search and filters.
- `/student/notifications`: Local notification list with mark-read, mark-all-read, and delete behavior.
- `/student/settings`: Profile/settings UI with local notification preferences and theme control.

### Lecturer Routes

- `/lecturer`: Lecturer dashboard with course, student, attendance, today's class, recent attendance, and course overview widgets.
- `/lecturer/generate`: QR generator UI using `qrcode.react`. It creates a client-side random string, displays it as a QR code, has a countdown, copy, refresh, download, and mock live attendance stats.
- `/lecturer/courses`: Lecturer course list with search and mock attendance summary.
- `/lecturer/analytics`: Lecturer charts and attendance analytics using mock chart data.
- `/lecturer/notifications`: Local notification list similar to student notifications.
- `/lecturer/settings`: Profile/settings UI with local notification preferences and theme control.

### Admin Routes

- `/admin`: Admin dashboard with totals, department chart, recent activity, and quick links.
- `/admin/users`: Mock user management list with search and filters.
- `/admin/courses`: Mock course management list with search and department filter.
- `/admin/departments`: Mock department overview with generated stats.
- `/admin/analytics`: Admin analytics charts with mock/generated data.

## 3. Existing Components

### App-Specific Components

- `DashboardLayout`: The main role-aware dashboard shell.
  - Student navigation: Dashboard, Scan QR, Schedule, History, Notifications.
  - Lecturer navigation: Dashboard, Generate QR, Courses, Analytics, Notifications.
  - Admin navigation: Dashboard, Users, Courses, Departments, Analytics.
  - Includes responsive mobile sidebar, desktop sidebar, top bar, user dropdown, logout, and theme toggle.
- `ThemeProvider`: Wrapper around `next-themes`.
- `AuthProvider` and `useAuth`: Mock auth provider in `lib/auth-context.tsx`.

### UI Components

The project includes a broad reusable UI kit under `components/ui/`, including:

- Layout/display: `card`, `accordion`, `tabs`, `table`, `separator`, `scroll-area`, `aspect-ratio`, `empty`, `item`, `sidebar`.
- Forms/inputs: `button`, `input`, `textarea`, `label`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `input-otp`, `form`, `field`.
- Overlays/menus: `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `dropdown-menu`, `context-menu`, `hover-card`, `tooltip`, `menubar`, `navigation-menu`, `command`.
- Feedback/status: `alert`, `badge`, `progress`, `skeleton`, `spinner`, `toast`, `toaster`, `sonner`.
- Data/visualization helpers: `chart`, `carousel`, `calendar`, `pagination`, `resizable`.

## 4. Missing Functionality

### Backend And Persistence

- No real API layer is implemented.
- No database connection is wired into the frontend.
- All data is hardcoded in `lib/mock-data.ts` or generated in components.
- Settings, notifications, QR scans, generated sessions, and attendance edits are not persisted beyond component state/local storage.

### Authentication And Authorization

- Login is mock-only and role-selected by tab.
- Passwords are not verified against real users.
- Sessions are stored as plain JSON in `localStorage`.
- Route protection is client-side only. A user can briefly load protected page code before redirect.
- No server-side RBAC, refresh tokens, password reset, email verification, or session revocation.

### QR Attendance

- Student scan page does not use the installed ZXing packages to decode QR content.
- QR generation creates a client-side random string, not a backend-issued signed/hashed token.
- No session creation, session start/close, QR token expiry validation, rotation validation, duplicate prevention, enrollment validation, or audit trail.
- Live attendance stats are static mock numbers.

### Data Management

- Admin user/course/department pages are mostly read-only mock management screens.
- No create/edit/delete flows are connected to persistence.
- No enrollment management.
- No lecturer assignment management.
- No import/export support for users, course lists, or attendance reports.

### Reporting And Analytics

- Analytics pages rely on hardcoded arrays or `Math.random()`, so numbers can change on render and do not reflect attendance records.
- No report export, scheduled reports, department/course/student drill-down, or audit-safe attendance summaries.

### UX/Quality Issues

- Some rendered separator text appears as mojibake, for example `â€¢`, where a bullet was likely intended.
- `app/student/page.tsx` calculates `unreadNotifications` but does not render it.
- `app/lecturer/page.tsx` calculates `attendance` in the course map but does not use it.
- `next.config.mjs` has `typescript.ignoreBuildErrors: true`, which can hide production-breaking type issues.
- There are both `package-lock.json` and `pnpm-lock.yaml`; choose one package manager to avoid dependency drift.
- The project has no visible test setup.

## 5. Recommended Backend Architecture

The existing `backend_architecture.md` and `database_schema.sql` are directionally strong. Recommended implementation:

### Backend Stack

- API: FastAPI or NestJS. FastAPI matches the existing architecture document; NestJS may fit better if the team wants TypeScript end to end.
- Database: PostgreSQL.
- ORM/migrations: SQLAlchemy + Alembic for FastAPI, or Prisma/Drizzle/TypeORM for NestJS.
- Cache/ephemeral state: Redis for QR rotation, rate limiting, short-lived scan/session state, and background job queues.
- Auth: JWT access tokens plus refresh-token rotation, with refresh tokens stored hashed server-side.
- Background jobs: Celery/RQ/Arq for FastAPI, or BullMQ for Node/NestJS.
- Object storage: S3-compatible storage for exported reports and optional uploads.

### Core Domain Modules

- Auth and sessions.
- Users and roles.
- Organizations/departments.
- Courses.
- Course instructors.
- Enrollments.
- Attendance sessions.
- QR tokens.
- Attendance scans.
- Attendance records.
- Notifications.
- Reports/exports.
- Audit logs.

### Required API Flows

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Admin CRUD for users, departments, courses, enrollments, and lecturer assignments.
- Lecturer creates/starts/closes attendance sessions.
- Backend issues short-lived QR tokens and stores only token hashes.
- Student submits scanned QR token to backend.
- Backend validates auth, role, enrollment, session status, token expiry, duplicate attendance, location/device policy if enabled, and writes both scan attempt and attendance record.
- Reports aggregate from attendance records, not frontend mock data.

### Security Priorities

- Enforce RBAC on the server, not only in React.
- Store password hashes with Argon2 or bcrypt.
- Store QR token hashes, not raw QR token values.
- Add database uniqueness constraints for one attendance record per student per session.
- Rate-limit login and scan endpoints.
- Add audit logs for manual attendance changes, admin changes, and session lifecycle events.
- Optionally add geofence, Wi-Fi/IP checks, device trust, and scan anomaly detection.

### Suggested Frontend Integration

- Replace `lib/mock-data.ts` helpers with typed API clients.
- Replace `AuthProvider` mock login with `/auth/login` and `/auth/me`.
- Add server-aware route protection using middleware or server components where possible.
- Use TanStack Query or SWR for API caching, loading, mutations, and invalidation.
- Make QR generation page call backend session/token endpoints.
- Make scan page decode QR with ZXing and submit the token to `/attendance/scan`.

## UI Run Check

Commands attempted:

```bash
npm.cmd run lint
npm.cmd run build
node node_modules\next\dist\bin\next build
node_modules\.bin\tsc.cmd --noEmit
```

Results:

- `npm run lint` initially failed in PowerShell because `npm.ps1` is blocked by local execution policy.
- `npm.cmd run lint` ran the script but failed because `eslint` is not installed or not linked.
- `npm.cmd run build` ran the script but failed because `next` is not available as a local binary.
- `node_modules/.bin` contains malformed temp-looking Next binary names such as `.next.cmd-imPtCa5j` instead of `next.cmd`.
- `node_modules/next` exists but is incomplete; it is missing the expected `dist/bin/next` file.
- TypeScript cannot resolve `next`, `next/navigation`, `next/link`, and `next/font/google`, which confirms the Next installation is incomplete.
- One real type issue was also visible: `app/student/scan/page.tsx` uses `<style jsx>`, but the current TypeScript setup reports `jsx` as an invalid property on `style`.

Conclusion: the UI is not currently runnable from this workspace without reinstalling/fixing dependencies. After dependency repair, run:

```bash
npm install
npm run build
npm run dev
```

or choose pnpm consistently:

```bash
pnpm install
pnpm build
pnpm dev
```

## Default Names And Naming Uniformity

I did not modify source files other than creating this analysis document.

Defaults/inconsistencies found:

- `package.json` name is `my-project`; recommended: `qr-attendance` or `qr-attend`.
- `app/layout.tsx` metadata uses the product name `QR Attend`.
- `app/layout.tsx` includes `generator: 'v0.app'`; remove it or replace with project-owned metadata.
- Public placeholder assets remain in `public/placeholder.*`; keep only if intentionally used, otherwise replace with branded assets.
- Domain role naming is mixed between frontend and backend:
  - Frontend uses `lecturer`.
  - `database_schema.sql` uses `instructor`.
  - Recommendation: choose one term. Since the UI already says Lecturer everywhere, update backend schema/API/domain language to `lecturer`, or update UI to `Instructor`. Do not keep both.
- The existing backend docs refer to "instructor" while the UI refers to "lecturer"; align documentation, API paths, enums, and UI labels.

Recommended uniform naming:

- Product/app display name: `QR Attend`.
- Package name: `qr-attend`.
- Database/API role enum: `admin`, `lecturer`, `student`, optionally `staff`.
- Route names can stay `/lecturer`, `/student`, `/admin`.

