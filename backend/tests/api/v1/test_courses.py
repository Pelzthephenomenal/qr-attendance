def test_create_course(client, admin_token):
    response = client.post(
        "/api/v1/courses",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "code": "CS101",
            "title": "Intro to CS",
            "academic_year": "2023",
            "term": "Fall",
            "is_active": True
        },
    )
    assert response.status_code == 201
    assert response.json()["code"] == "CS101"


def test_list_courses(client, admin_token):
    client.post("/api/v1/courses", headers={"Authorization": f"Bearer {admin_token}"}, json={"code": "CS102", "title": "Data Structures"})
    response = client.get("/api/v1/courses", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_update_course(client, admin_token):
    create_resp = client.post("/api/v1/courses", headers={"Authorization": f"Bearer {admin_token}"}, json={"code": "CS103", "title": "Old Title"})
    course_id = create_resp.json()["id"]
    
    update_resp = client.patch(f"/api/v1/courses/{course_id}", headers={"Authorization": f"Bearer {admin_token}"}, json={"title": "New Title"})
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "New Title"


def test_delete_course(client, admin_token):
    create_resp = client.post("/api/v1/courses", headers={"Authorization": f"Bearer {admin_token}"}, json={"code": "CS104", "title": "To Delete"})
    course_id = create_resp.json()["id"]
    
    del_resp = client.delete(f"/api/v1/courses/{course_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_resp.status_code == 204
    
    # It should still be gettable but is_active = False
    get_resp = client.get(f"/api/v1/courses/{course_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert get_resp.status_code == 200
    assert get_resp.json()["is_active"] is False
