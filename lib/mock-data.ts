// Mock data for the QR Attendance System

export type UserRole = 'student' | 'lecturer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: string
  studentId?: string
  employeeId?: string
}

export interface Course {
  id: string
  code: string
  name: string
  department: string
  lecturerId: string
  lecturerName: string
  schedule: ClassSchedule[]
  students: string[]
}

export interface ClassSchedule {
  id: string
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  startTime: string
  endTime: string
  room: string
}

export interface AttendanceRecord {
  id: string
  courseId: string
  courseName: string
  courseCode: string
  studentId: string
  studentName: string
  date: string
  time: string
  status: 'present' | 'absent' | 'late'
  markedBy: 'qr' | 'manual'
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'reminder'
  timestamp: string
  read: boolean
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'student-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@university.edu',
    role: 'student',
    department: 'Computer Science',
    studentId: 'CS2024001',
  },
  {
    id: 'lecturer-1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@university.edu',
    role: 'lecturer',
    department: 'Computer Science',
    employeeId: 'EMP001',
  },
  {
    id: 'admin-1',
    name: 'Michael Roberts',
    email: 'michael.roberts@university.edu',
    role: 'admin',
    employeeId: 'ADM001',
  },
]

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    code: 'CS301',
    name: 'Data Structures & Algorithms',
    department: 'Computer Science',
    lecturerId: 'lecturer-1',
    lecturerName: 'Dr. Sarah Chen',
    schedule: [
      { id: 'sch-1', day: 'Monday', startTime: '09:00', endTime: '10:30', room: 'Room 301' },
      { id: 'sch-2', day: 'Wednesday', startTime: '09:00', endTime: '10:30', room: 'Room 301' },
    ],
    students: ['student-1', 'student-2', 'student-3'],
  },
  {
    id: 'course-2',
    code: 'CS302',
    name: 'Database Management Systems',
    department: 'Computer Science',
    lecturerId: 'lecturer-1',
    lecturerName: 'Dr. Sarah Chen',
    schedule: [
      { id: 'sch-3', day: 'Tuesday', startTime: '14:00', endTime: '15:30', room: 'Room 205' },
      { id: 'sch-4', day: 'Thursday', startTime: '14:00', endTime: '15:30', room: 'Room 205' },
    ],
    students: ['student-1', 'student-4', 'student-5'],
  },
  {
    id: 'course-3',
    code: 'CS303',
    name: 'Software Engineering',
    department: 'Computer Science',
    lecturerId: 'lecturer-1',
    lecturerName: 'Dr. Sarah Chen',
    schedule: [
      { id: 'sch-5', day: 'Friday', startTime: '11:00', endTime: '12:30', room: 'Lab 102' },
    ],
    students: ['student-1', 'student-2', 'student-6'],
  },
  {
    id: 'course-4',
    code: 'CS401',
    name: 'Machine Learning',
    department: 'Computer Science',
    lecturerId: 'lecturer-1',
    lecturerName: 'Dr. Sarah Chen',
    schedule: [
      { id: 'sch-6', day: 'Monday', startTime: '14:00', endTime: '16:00', room: 'Lab 201' },
    ],
    students: ['student-1', 'student-3', 'student-7'],
  },
]

// Mock Attendance Records
export const mockAttendance: AttendanceRecord[] = [
  { id: 'att-1', courseId: 'course-1', courseName: 'Data Structures & Algorithms', courseCode: 'CS301', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-25', time: '09:02', status: 'present', markedBy: 'qr' },
  { id: 'att-2', courseId: 'course-1', courseName: 'Data Structures & Algorithms', courseCode: 'CS301', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-23', time: '09:00', status: 'present', markedBy: 'qr' },
  { id: 'att-3', courseId: 'course-2', courseName: 'Database Management Systems', courseCode: 'CS302', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-22', time: '14:05', status: 'late', markedBy: 'qr' },
  { id: 'att-4', courseId: 'course-2', courseName: 'Database Management Systems', courseCode: 'CS302', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-20', time: '14:00', status: 'present', markedBy: 'qr' },
  { id: 'att-5', courseId: 'course-3', courseName: 'Software Engineering', courseCode: 'CS303', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-23', time: '11:00', status: 'present', markedBy: 'qr' },
  { id: 'att-6', courseId: 'course-3', courseName: 'Software Engineering', courseCode: 'CS303', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-16', time: '', status: 'absent', markedBy: 'manual' },
  { id: 'att-7', courseId: 'course-4', courseName: 'Machine Learning', courseCode: 'CS401', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-26', time: '14:01', status: 'present', markedBy: 'qr' },
  { id: 'att-8', courseId: 'course-4', courseName: 'Machine Learning', courseCode: 'CS401', studentId: 'student-1', studentName: 'Alex Johnson', date: '2026-05-19', time: '14:00', status: 'present', markedBy: 'qr' },
]

// Mock Notifications
export const mockNotifications: Notification[] = [
  { id: 'notif-1', title: 'Upcoming Class', message: 'CS301 - Data Structures starts in 30 minutes', type: 'reminder', timestamp: '2026-05-28T08:30:00', read: false },
  { id: 'notif-2', title: 'Attendance Marked', message: 'Your attendance for Machine Learning has been recorded', type: 'success', timestamp: '2026-05-26T14:02:00', read: true },
  { id: 'notif-3', title: 'Low Attendance Warning', message: 'Your attendance in CS303 is below 75%', type: 'warning', timestamp: '2026-05-25T10:00:00', read: false },
  { id: 'notif-4', title: 'Schedule Change', message: 'CS302 lab session moved to Room 301', type: 'info', timestamp: '2026-05-24T15:00:00', read: true },
]

// Helper functions
export function getAttendancePercentage(studentId: string, courseId?: string): number {
  const records = courseId 
    ? mockAttendance.filter(a => a.studentId === studentId && a.courseId === courseId)
    : mockAttendance.filter(a => a.studentId === studentId)
  
  if (records.length === 0) return 0
  
  const present = records.filter(a => a.status === 'present' || a.status === 'late').length
  return Math.round((present / records.length) * 100)
}

export function getStudentCourses(studentId: string): Course[] {
  return mockCourses.filter(c => c.students.includes(studentId))
}

export function getLecturerCourses(lecturerId: string): Course[] {
  return mockCourses.filter(c => c.lecturerId === lecturerId)
}

export function getTodaySchedule(userId: string, role: UserRole): { course: Course; schedule: ClassSchedule }[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const today = days[new Date().getDay()] as ClassSchedule['day']
  
  const courses = role === 'student' 
    ? getStudentCourses(userId)
    : getLecturerCourses(userId)
  
  const todayClasses: { course: Course; schedule: ClassSchedule }[] = []
  
  courses.forEach(course => {
    course.schedule.forEach(sch => {
      if (sch.day === today) {
        todayClasses.push({ course, schedule: sch })
      }
    })
  })
  
  return todayClasses.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime))
}

// Mock students for lecturer view
export const mockStudentsList = [
  { id: 'student-1', name: 'Alex Johnson', studentId: 'CS2024001', email: 'alex.johnson@university.edu' },
  { id: 'student-2', name: 'Emma Williams', studentId: 'CS2024002', email: 'emma.williams@university.edu' },
  { id: 'student-3', name: 'James Brown', studentId: 'CS2024003', email: 'james.brown@university.edu' },
  { id: 'student-4', name: 'Olivia Davis', studentId: 'CS2024004', email: 'olivia.davis@university.edu' },
  { id: 'student-5', name: 'Liam Miller', studentId: 'CS2024005', email: 'liam.miller@university.edu' },
  { id: 'student-6', name: 'Sophia Wilson', studentId: 'CS2024006', email: 'sophia.wilson@university.edu' },
  { id: 'student-7', name: 'Noah Taylor', studentId: 'CS2024007', email: 'noah.taylor@university.edu' },
]

// Department list
export const departments = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Business Administration',
  'Mathematics',
  'Physics',
]

// Generate attendance for lecturer view
export function getCourseAttendance(courseId: string): { student: typeof mockStudentsList[0]; records: AttendanceRecord[] }[] {
  const course = mockCourses.find(c => c.id === courseId)
  if (!course) return []
  
  return course.students.map(studentId => {
    const student = mockStudentsList.find(s => s.id === studentId)!
    const records = mockAttendance.filter(a => a.courseId === courseId && a.studentId === studentId)
    return { student, records }
  })
}
