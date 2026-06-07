'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import api from '@/lib/api-client'
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2,
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899']

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [dateRange, setDateRange] = useState('month')
  const [deptFilter, setDeptFilter] = useState('all')

  const [adminStats, setAdminStats] = useState<any>(null)
  const [departmentsList, setDepartmentsList] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Real Analytics States
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])
  const [departmentComparison, setDepartmentComparison] = useState<any[]>([])
  const [attendanceDistribution, setAttendanceDistribution] = useState<any[]>([])
  const [weeklyPattern, setWeeklyPattern] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    avgAttendance: 0,
    attendanceTrend: 0,
    totalSessions: 0,
    activeStudents: 0,
  })

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || user.role !== 'admin') return;
      try {
        setIsLoadingData(true)
        setError(null)
        const [statsData, deptsData] = await Promise.all([
          api.apiService.getAdminAnalytics(),
          api.apiService.getDepartments()
        ])
        setAdminStats(statsData)
        setDepartmentsList(deptsData)

        // Set state from backend analytics response
        setMonthlyTrend(statsData.monthly_trend || [])
        setDepartmentComparison(statsData.department_comparison || [])
        setAttendanceDistribution(statsData.attendance_distribution || [])
        setWeeklyPattern(statsData.weekly_pattern || [])
        setStats({
          avgAttendance: statsData.avg_attendance ?? 0,
          attendanceTrend: statsData.attendance_trend ?? 0,
          totalSessions: statsData.total_sessions ?? 0,
          activeStudents: statsData.total_students ?? 0,
        })
      } catch (err) {
        setError(api.getErrorMessage(err))
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchAnalytics()
  }, [user, isLoading])

  if (isLoading || !user) {
    return null
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await api.apiService.exportAttendanceCSV({
        dateFrom: dateRange === 'week'
          ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
          : dateRange === 'month'
            ? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
            : dateRange === 'semester'
              ? new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)
              : new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
        ...(deptFilter !== 'all' ? {} : {}),
      })
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">System Analytics</h1>
            <p className="text-muted-foreground mt-1">University-wide attendance insights</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting} id="admin-export-btn">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departmentsList.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="semester">This Semester</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
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

        {!isLoadingData && !error && adminStats && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                      <p className="text-2xl font-bold">{stats.avgAttendance}%</p>
                      <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3" />
                        +{stats.attendanceTrend}% from last month
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Courses</p>
                      <p className="text-2xl font-bold">{adminStats.total_courses.toLocaleString()}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Students</p>
                      <p className="text-2xl font-bold">{adminStats.total_students.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Lecturers</p>
                      <p className="text-2xl font-bold text-primary">{adminStats.total_lecturers}</p>
                      <p className="text-xs text-muted-foreground mt-1">Teaching staff</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Trend</CardTitle>
              <CardDescription>Monthly attendance rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[60, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="attendance" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#colorAttendance)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Department Comparison</CardTitle>
              <CardDescription>Attendance by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Attendance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Distribution</CardTitle>
              <CardDescription>Students by attendance range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {attendanceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {attendanceDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs">{item.name}: {item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Pattern */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Pattern</CardTitle>
              <CardDescription>Attendance by day of week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[60, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
        )}
      </div>
    </DashboardLayout>
  )
}
