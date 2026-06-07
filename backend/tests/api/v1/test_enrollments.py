def test_assign_remove_student(client, admin_token, test_user):
    # Create course first
    course_resp = client.post(
        "/api/v1/courses",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"code": "ENR101", "title": "Enrollment Test"},
    )
    course_id = course_resp.json()["id"]
    student_id = str(test_user.id)
    
    # Assign student
    assign_resp = client.post(
        f"/api/v1/courses/{course_id}/enrollments",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"student_id": student_id}
    )
    assert assign_resp.status_code == 201
    assert assign_resp.json()["student_id"] == student_id
    assert assign_resp.json()["is_active"] is True
    
    # List enrollments
    list_resp = client.get(f"/api/v1/courses/{course_id}/enrollments", headers={"Authorization": f"Bearer {admin_token}"})
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    
    # Remove student
    rem_resp = client.delete(f"/api/v1/courses/{course_id}/enrollments/{student_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert rem_resp.status_code == 204
    
    # List enrollments again, should be empty (since we only list active)
    list_empty = client.get(f"/api/v1/courses/{course_id}/enrollments", headers={"Authorization": f"Bearer {admin_token}"})
    assert len(list_empty.json()) == 0
