'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api-client'
import { 
  BookOpen, 
  Users, 
  Clock, 
  MapPin, 
  Search,
  QrCode,
  TrendingUp,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export default function LecturerCoursesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return null
  }

  const [coursesData, setCoursesData] = useState<any[]>([])
  const [courseStatsMap, setCourseStatsMap] = useState<Record<string, any>>({})
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || user.role !== 'lecturer') return;
      try {
        setIsLoadingData(true)
        setError(null)
        const [courses, stats] = await Promise.all([
          api.apiService.getMyCourses(),
          api.apiService.getLecturerCourseStats(),
        ])
        setCoursesData(courses)
        const map: Record<string, any> = {}
        stats.forEach((s: any) => { map[s.course_id] = s })
        setCourseStatsMap(map)
      } catch (err) {
        setError(api.getErrorMessage(err))
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchCourses()
  }, [user, isLoading])

  if (isLoading || !user) {
    return null
  }

  const filteredCourses = coursesData.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Courses</h1>
            <p className="text-muted-foreground mt-1">Manage your courses and view attendance</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Loading and Error States */}
        {isLoadingData && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && !isLoadingData && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Courses Grid */}
        {!isLoadingData && !error && (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredCourses.map((course) => {
              const stats = courseStatsMap[course.id]
              const avgAttendance = stats?.avg_attendance ?? 0
              const closedSessions = stats?.closed_sessions ?? 0

              return (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {course.code}
                        </span>
                        <CardTitle className="text-lg mt-2">{course.title}</CardTitle>
                        <CardDescription>{course.department_id ? 'Assigned to Dept' : 'Unassigned'}</CardDescription>
                      </div>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{course.student_count || 0} students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{avgAttendance}% avg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{closedSessions} session{closedSessions !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Attendance Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Average Attendance</span>
                        <span className={`text-sm font-medium ${
                          avgAttendance >= 75 ? 'text-green-500' : 
                          avgAttendance >= 60 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {avgAttendance}%
                        </span>
                      </div>
                      <Progress value={avgAttendance} className="h-2" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Link href="/lecturer/generate" className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <QrCode className="h-4 w-4" />
                          Generate QR
                        </Button>
                      </Link>
                      <Link href="/lecturer/analytics">
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!isLoadingData && !error && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No courses found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
