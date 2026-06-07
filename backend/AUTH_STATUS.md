## Authentication System Status

This document reflects the current backend auth implementation.

### Implemented

#### Security helpers
- `hash_password()` uses bcrypt password hashing.
- `verify_password()` verifies bcrypt hashes.
- `create_access_token()` creates short-lived JWT access tokens.
- `create_refresh_token()` creates longer-lived JWT refresh tokens.

#### Auth service
- `register_user()` creates a user and organization when needed.
- `login_user()` validates email/password, checks active status, and updates `last_login_at`.
- `refresh_user_token()` verifies refresh tokens and rotates them.
- `logout_user()` revokes the submitted refresh token.

#### API endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`, with IP-based rate limiting
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

#### Database models
- `User` includes email, password hash, role, active status, verification status, and organization/department references.
- `RefreshToken` stores hashed refresh tokens, expiration, revocation time, and replacement links.

#### Configuration
- JWT secret, algorithm, access token TTL, and refresh token TTL are configurable.
- Login rate limit attempt/window settings are configurable.
- Development CORS is configured for the frontend dev server.
- `AUTO_CREATE_TABLES=true` can create tables during development.

#### Authorization dependencies
- `require_student`
- `require_instructor`
- `require_admin`
- `require_staff`
- `require_admin_or_staff`

### Still Missing

- Password change and password reset endpoints are not implemented.
- Email verification is modeled with `is_verified`, but no verification flow exists.
- Refresh token metadata such as IP address and user agent is modeled but not populated.
- Auth tests are not present yet.

### Frontend Compatibility Notes

- The backend role for lecturer-facing users is currently `instructor`.
- The frontend route remains `/lecturer`, so frontend routing maps `instructor` to `lecturer`.
- The frontend stores access and refresh tokens in `localStorage` for now. This works for development, but a production hardening pass should consider an HTTP-only cookie strategy.

### Recommended Phase 1 Remaining Work

1. Add auth tests for login, refresh rotation, logout revocation, inactive users, and wrong-role access.
2. Add password change and reset flows.
3. Decide whether production auth should continue using bearer tokens in browser storage or move refresh tokens to HTTP-only cookies.
