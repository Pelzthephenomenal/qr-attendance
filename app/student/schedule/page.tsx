'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api-client'
import { useState } from 'react'
import { Clock, MapPin } from 'lucide-react'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

export default function StudentSchedulePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [scheduleData, setScheduleData] = useState<any[]>([])
  const [coursesData, setCoursesData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

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
        const [weeklySch, coursesRes] = await Promise.all([
          api.apiService.getWeeklySchedule(),
          api.apiService.getMyCourses()
        ])
        setScheduleData(weeklySch)
        setCoursesData(coursesRes)
      } catch (err) {
        console.error('Error fetching student schedule:', err)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchData()
  }, [user, isLoading])

  if (isLoading || !user || isLoadingData) {
    return null
  }

  // Group schedule by day
  const scheduleByDay = days.map((day, index) => {
    // day_of_week in DB: 0 is Monday, 6 is Sunday
    const classesForDay = scheduleData.filter(s => s.day_of_week === index).map(s => {
      const course = coursesData.find(c => c.id === s.course_id)
      return { ...s, course }
    }).sort((a, b) => a.start_time.localeCompare(b.start_time))
    
    return { day, classes: classesForDay }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground mt-1">Your weekly class timetable</p>
        </div>

        <div className="grid gap-4">
          {scheduleByDay.map(({ day, classes }) => (
            <Card key={day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{day}</CardTitle>
                <CardDescription>
                  {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No classes scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {classes.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                      >
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {item.course?.code || 'Unknown'}
                            </span>
                          </div>
                          <p className="font-medium truncate">{item.course?.title || 'Unknown Course'}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {item.start_time.substring(0,5)} - {item.end_time.substring(0,5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {item.room || 'TBA'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Lecturer</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
