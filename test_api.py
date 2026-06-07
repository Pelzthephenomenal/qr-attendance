import urllib.request
import json

# Login as lecturer
data = json.dumps({"email": "lecturer@example.com", "password": "password123"}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    result = json.loads(response.read())
    token = result['access_token']
    
    # Fetch courses
    req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/courses/me/courses', headers={'Authorization': f'Bearer {token}'})
    response2 = urllib.request.urlopen(req2)
    courses = json.loads(response2.read())
    print("SUCCESS: My Courses API is working!")
    print(f"Courses returned: {len(courses)}")
except Exception as e:
    print(f"ERROR: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
