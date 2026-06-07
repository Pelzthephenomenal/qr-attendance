'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  BookOpen, 
  Building,
  TrendingUp,
  ChevronRight,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  QrCode,
  CalendarCheck,
} from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api-client'
import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [stats, setStats] = useState<any>(null)
  const [departmentsData, setDepartmentsData] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        setIsLoadingData(true)
        const [analyticsRes, activityRes] = await Promise.all([
          api.apiService.getAdminAnalytics(),
          api.apiService.getAdminRecentActivity(),
        ])
        setStats({
          totalStudents: analyticsRes.total_students,
          totalLecturers: analyticsRes.total_lecturers,
          totalCourses: analyticsRes.total_courses,
          departments: analyticsRes.total_departments,
          avgAttendance: analyticsRes.avg_attendance ?? 0,
        })
        setDepartmentsData((analyticsRes.department_comparison || []).map((dept: any) => ({
          name: dept.name,
          students: dept.students,
          attendance: dept.attendance,
        })))
        setRecentActivity(activityRes)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchData()
  }, [user, isLoading])

  if (isLoading || !user || isLoadingData || !stats) {
    return null
  }

  const getActivityIcon = (type: string, role: string) => {
    if (type === 'session') return <CalendarCheck className="h-4 w-4 text-chart-2" />
    if (type === 'qr') return <QrCode className="h-4 w-4 text-primary" />
    if (type === 'override') return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    if (role === 'student') return <GraduationCap className="h-4 w-4 text-chart-1" />
    if (role === 'lecturer') return <Briefcase className="h-4 w-4 text-chart-2" />
    return <Users className="h-4 w-4 text-chart-3" />
  }

  const getActivityBg = (type: string, role: string) => {
    if (type === 'session') return 'bg-chart-2/10'
    if (type === 'qr') return 'bg-primary/10'
    if (type === 'override') return 'bg-yellow-500/10'
    if (role === 'student') return 'bg-chart-1/10'
    if (role === 'lecturer') return 'bg-chart-2/10'
    return 'bg-chart-3/10'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalStudents.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-1/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Lecturers</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalLecturers}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalCourses}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-3/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold mt-1">{stats.departments}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-chart-4" />
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
                <div className="h-12 w-12 rounded-full bg-chart-5/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-5" />
                </div>
              </div>
              <Progress value={stats.avgAttendance} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Department Performance */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Department Performance</CardTitle>
                <CardDescription>Students and attendance by department</CardDescription>
              </div>
              <Link href="/admin/analytics">
                <Button variant="ghost" size="sm">
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest system events</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${getActivityBg(activity.type, activity.role)}`}>
                        {getActivityIcon(activity.type, activity.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/admin/users">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Manage Users</p>
                  <p className="text-sm text-muted-foreground">Students & Lecturers</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/courses">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <p className="font-medium">Manage Courses</p>
                  <p className="text-sm text-muted-foreground">Add & Edit Courses</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/departments">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Departments</p>
                  <p className="text-sm text-muted-foreground">Manage Departments</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/analytics">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-chart-4" />
                </div>
                <div>
                  <p className="font-medium">Analytics</p>
                  <p className="text-sm text-muted-foreground">Reports & Insights</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
