from app.db.session import SessionLocal
from app.models.user import User
from app.models.course import Course, CourseInstructor
from app.services.course_service import list_my_courses, list_courses

db = SessionLocal()

# Find the admin user
admin = db.query(User).filter_by(role="admin").first()
print(f"Admin: {admin.email}")

# Find the lecturer user
lecturer = db.query(User).filter_by(role="lecturer").first()
print(f"Lecturer: {lecturer.email}")

# Get all courses
courses = list_courses(db, current_user=admin)
print(f"All courses: {[c.code for c in courses]}")

# Check course instructors
for c in db.query(Course).all():
    instructors = db.query(CourseInstructor).filter_by(course_id=c.id).all()
    print(f"Course {c.code} instructors: {[i.instructor_id for i in instructors]}")

# Get my courses for lecturer
my_courses = list_my_courses(db, current_user=lecturer)
print(f"Lecturer courses: {[c.code for c in my_courses]}")

db.close()
