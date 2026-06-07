'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  QrCode, 
  Users, 
  BookOpen, 
  TrendingUp,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { mockStudentsList } from '@/lib/mock-data'
import api from '@/lib/api-client'
import { useState } from 'react'

export default function LecturerDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [courses, setCourses] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [stats, setStats] = useState({ totalStudents: 0, avgAttendance: 78 })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'lecturer') return;
      try {
        setIsLoadingData(true)
        const [coursesRes, schedulesRes] = await Promise.all([
          api.apiService.getMyCourses(),
          api.apiService.getTodaySchedule()
        ])
        setCourses(coursesRes)
        
        // Map schedules to courses
        const mappedClasses = schedulesRes.map((sch: any) => {
          const course = coursesRes.find((c: any) => c.id === sch.course_id)
          return course ? { course, schedule: sch } : null
        }).filter(Boolean)
        
        setTodayClasses(mappedClasses)
        
        setStats({
          totalStudents: coursesRes.reduce((acc: number, curr: any) => acc + (curr.student_count || 0), 0),
          avgAttendance: 78 // Mocked average
        })
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchData()
  }, [user, isLoading])

  if (isLoading || !user || isLoadingData) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Generate QR Code</p>
                  <p className="text-xs opacity-75 mt-1">Start attendance session</p>
                </div>
                <Link href="/lecturer/generate">
                  <Button size="icon" variant="secondary" className="rounded-full">
                    <QrCode className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-1/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">My Courses</p>
                  <p className="text-2xl font-bold mt-1">{courses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
                  <p className="text-2xl font-bold mt-1">{stats.avgAttendance}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-3" />
                </div>
              </div>
              <Progress value={stats.avgAttendance} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Classes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today&apos;s Classes</CardTitle>
                <CardDescription>Your scheduled classes for today</CardDescription>
              </div>
              <Link href="/lecturer/generate">
                <Button variant="ghost" size="sm">
                  Start Session
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No classes scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map(({ course, schedule }) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {course.code}
                          </span>
                        </div>
                        <p className="font-medium truncate">{course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)} • {schedule.room || 'TBA'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{course.student_count || 0}</p>
                        <p className="text-xs text-muted-foreground">students</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                <CardDescription>Latest student check-ins</CardDescription>
              </div>
              <Link href="/lecturer/analytics">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockStudentsList.slice(0, 5).map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    {index % 3 === 0 ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      index % 3 === 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {index % 3 === 0 ? 'Absent' : 'Present'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">My Courses</CardTitle>
              <CardDescription>Overview of your courses</CardDescription>
            </div>
            <Link href="/lecturer/courses">
              <Button variant="ghost" size="sm">
                Manage Courses
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map((course) => {
                const presentCount = Math.floor((course.student_count || 0) * 0.8) // Mock data
                return (
                  <div key={course.id} className="p-4 rounded-lg bg-muted/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <p className="font-medium mt-2 truncate">{course.title}</p>
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-muted-foreground">{course.student_count || 0} students</span>
                      <span className="text-green-500 font-medium">{presentCount} present</span>
                    </div>
                    <Progress value={course.student_count ? (presentCount / course.student_count) * 100 : 0} className="mt-2 h-1.5" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
