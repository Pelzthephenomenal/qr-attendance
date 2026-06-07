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
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api-client'
import { useState } from 'react'

export default function StudentDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [courses, setCourses] = useState<any[]>([])
  const [todayClasses, setTodayClasses] = useState<any[]>([])
  const [recentRecords, setRecentRecords] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [stats, setStats] = useState({ overallAttendance: 0 })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'student')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'student') return;
      try {
        setIsLoadingData(true)
        const [coursesRes, schedulesRes, historyRes] = await Promise.all([
          api.apiService.getMyCourses(),
          api.apiService.getTodaySchedule(),
          api.apiService.getStudentHistory()
        ])
        setCourses(coursesRes)
        
        // Map schedules to courses
        const mappedClasses = schedulesRes.map((sch: any) => {
          const course = coursesRes.find((c: any) => c.id === sch.course_id)
          return course ? { course, schedule: sch } : null
        }).filter(Boolean)
        
        setTodayClasses(mappedClasses)
        setRecentRecords(historyRes.slice(0, 5))
        setStats({ overallAttendance: 85 }) // Mock overall average
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
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
                  <p className="text-sm font-medium opacity-90">Scan QR Code</p>
                  <p className="text-xs opacity-75 mt-1">Mark your attendance</p>
                </div>
                <Link href="/student/scan">
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
                  <p className="text-sm font-medium text-muted-foreground">Overall Attendance</p>
                  <p className="text-2xl font-bold mt-1">{stats.overallAttendance}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-1/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-1" />
                </div>
              </div>
              <Progress value={stats.overallAttendance} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today&apos;s Classes</p>
                  <p className="text-2xl font-bold mt-1">{todayClasses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enrolled Courses</p>
                  <p className="text-2xl font-bold mt-1">{courses.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
                <CardDescription>Your classes for today</CardDescription>
              </div>
              <Link href="/student/schedule">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No classes scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayClasses.map(({ course, schedule }) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)} • {schedule.room || 'TBA'}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                        {course.code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Attendance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Attendance</CardTitle>
                <CardDescription>Your latest attendance records</CardDescription>
              </div>
              <Link href="/student/history">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    {getStatusIcon(record.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{record.session?.course?.title || 'Unknown Course'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.scanned_at).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        {` • ${new Date(record.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <span className={`text-xs font-medium capitalize px-2 py-1 rounded ${
                      record.status === 'present' ? 'bg-green-500/10 text-green-500' :
                      record.status === 'late' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Attendance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Attendance</CardTitle>
            <CardDescription>Your attendance percentage by course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {courses.map((course) => {
                const percentage = 85 // Mock attendance per course
                return (
                  <div key={course.id} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{course.code}</span>
                      <span className={`text-sm font-bold ${
                        percentage >= 75 ? 'text-green-500' : 
                        percentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-2 truncate">{course.title}</p>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${
                        percentage >= 75 ? '[&>div]:bg-green-500' : 
                        percentage >= 60 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                      }`}
                    />
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
