def test_create_department(client, admin_token):
    response = client.post(
        "/api/v1/departments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Computer Science", "code": "CS"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Computer Science"
    assert data["code"] == "CS"
    assert "id" in data


def test_list_departments(client, admin_token):
    # Create one first
    client.post("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "Dep1"})
    
    response = client.get("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Dep1"


def test_update_department(client, admin_token):
    create_resp = client.post("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "DepOld"})
    dep_id = create_resp.json()["id"]
    
    update_resp = client.patch(f"/api/v1/departments/{dep_id}", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "DepNew"})
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "DepNew"


def test_delete_department(client, admin_token):
    create_resp = client.post("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"}, json={"name": "DepToDelete"})
    dep_id = create_resp.json()["id"]
    
    del_resp = client.delete(f"/api/v1/departments/{dep_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_resp.status_code == 204
    
    get_resp = client.get(f"/api/v1/departments/{dep_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert get_resp.status_code == 404
