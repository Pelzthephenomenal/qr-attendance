from app.models.refresh_token import RefreshToken

def test_register_success(client, test_organization):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "first_name": "New",
            "last_name": "User",
            "role": "student",
            "matric_no": "MATRIC123",
            "organization_id": str(test_organization.id)
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newuser@example.com"


def test_register_duplicate_email(client, test_user):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_user.email,
            "password": "SecurePassword123!",
            "first_name": "Duplicate",
            "last_name": "User",
            "role": "student",
            "matric_no": "MATRIC124",
            "organization_id": str(test_user.organization_id)
        },
    )
    assert response.status_code == 409


def test_login_success(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["id"] == str(test_user.id)


def test_login_invalid_password(client, test_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_login_inactive_user(client, db_session, test_user):
    test_user.is_active = False
    db_session.commit()
    
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword",
        },
    )
    assert response.status_code == 403


def test_refresh_token_success(client, test_user):
    # First login to get a refresh token
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword",
        },
    )
    refresh_token = login_response.json()["refresh_token"]

    # Now refresh
    response = client.post(
        "/api/v1/auth/refresh",
        json={
            "refresh_token": refresh_token,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != refresh_token


def test_logout_success(client, db_session, test_user):
    # Login to get refresh token
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword",
        },
    )
    refresh_token = login_response.json()["refresh_token"]

    # Logout
    response = client.post(
        "/api/v1/auth/logout",
        json={
            "refresh_token": refresh_token,
        },
    )
    assert response.status_code == 204

    # Verify token is revoked in DB
    import hashlib
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db_token = db_session.query(RefreshToken).filter_by(token_hash=token_hash).first()
    assert db_token.revoked_at is not None


def test_me_success(client, test_user):
    # Login to get access token
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "testpassword",
        },
    )
    access_token = login_response.json()["access_token"]

    # Get /me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user.id)
    assert data["email"] == test_user.email


def test_me_unauthorized(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
