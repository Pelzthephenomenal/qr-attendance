# QR Attend Backend

FastAPI backend for authentication and user registration.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

The API runs at:

```text
http://127.0.0.1:8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

## Auth Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Roles:

- `student`
- `instructor`
- `admin`
- `staff`

For development, `AUTO_CREATE_TABLES=true` creates the authentication tables on startup. Use Alembic migrations before production.

## Database

Run migrations from the backend directory:

```bash
alembic upgrade head
```

Seed development data:

```bash
python -m app.db.seed
```

Seed users use `password123`:

- `admin@example.com`
- `lecturer@example.com`
- `student@example.com`
