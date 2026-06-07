import io

def test_bulk_import_users(client, admin_token):
    csv_content = b"""email,first_name,last_name,role,matric_no
bulk1@example.com,Bulk1,User,student,MATB1
bulk2@example.com,Bulk2,User,student,MATB2
"""
    response = client.post(
        "/api/v1/users/bulk-import",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("users.csv", csv_content, "text/csv")}
    )
    
    assert response.status_code == 201
    assert response.json()["imported"] == 2
    assert len(response.json()["errors"]) == 0
    
    # Verify users exist
    list_resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {admin_token}"})
    users = list_resp.json()
    emails = [u["email"] for u in users]
    assert "bulk1@example.com" in emails
    assert "bulk2@example.com" in emails


def test_bulk_import_enrollments(client, admin_token, course):
    # First create a user to enroll
    client.post(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "enrollbulk@example.com",
            "password": "SecurePassword123!",
            "first_name": "Enroll",
            "last_name": "Bulk",
            "role": "student",
            "matric_no": "ENROLLB1"
        },
    )
    
    csv_content = b"""student_email,matric_no
enrollbulk@example.com,
,ENROLLB1
"""
    
    response = client.post(
        f"/api/v1/courses/{course.id}/enrollments/bulk-import",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("enrollments.csv", csv_content, "text/csv")}
    )
    
    assert response.status_code == 201
    assert response.json()["imported"] >= 1
    
    # Verify enrollment
    enroll_resp = client.get(
        f"/api/v1/courses/{course.id}/enrollments",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    enrolled_students = enroll_resp.json()
    assert len(enrolled_students) >= 1
