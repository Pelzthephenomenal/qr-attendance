def test_create_user(client, admin_token):
    response = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "staff1@example.com",
            "password": "SecurePassword123!",
            "first_name": "New",
            "last_name": "Staff",
            "role": "staff",
            "staff_no": "STAFF001"
        },
    )
    assert response.status_code == 201
    assert response.json()["email"] == "staff1@example.com"


def test_list_users(client, admin_token):
    response = client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_update_user(client, admin_token):
    # create user
    create_resp = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "toupdate@example.com",
            "password": "SecurePassword123!",
            "first_name": "Old",
            "last_name": "Name",
            "role": "student",
            "matric_no": "MAT123"
        },
    )
    user_id = create_resp.json()["id"]
    
    update_resp = client.patch(
        f"/api/v1/users/{user_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"first_name": "UpdatedName"}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["first_name"] == "UpdatedName"


def test_delete_user(client, admin_token):
    create_resp = client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "todelete@example.com",
            "password": "SecurePassword123!",
            "first_name": "Delete",
            "last_name": "Me",
            "role": "student",
            "matric_no": "DEL123"
        },
    )
    user_id = create_resp.json()["id"]
    
    del_resp = client.delete(f"/api/v1/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_resp.status_code == 204
    
    # User still exists but is_active is False
    get_resp = client.get(f"/api/v1/users/{user_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert get_resp.status_code == 200
    assert get_resp.json()["is_active"] is False
