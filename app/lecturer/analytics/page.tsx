'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api-client'
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  BookOpen,
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
  Area,
} from 'recharts'

export default function LecturerAnalyticsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!user || user.role !== 'lecturer') return
      try {
        setIsLoadingData(true)
        setError(null)
        const data = await api.apiService.getLecturerAnalytics()
        setAnalyticsData(data)
      } catch (err) {
        setError(api.getErrorMessage(err))
      } finally {
        setIsLoadingData(false)
      }
    }
    if (!isLoading) fetchData()
  }, [user, isLoading])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await api.apiService.exportAttendanceCSV({})
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading || !user) return null

  const trend = analyticsData?.attendance_trend ?? 0
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  const trendColor = trend >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Attendance Analytics</h1>
            <p className="text-muted-foreground mt-1">Track and analyse attendance patterns across your courses</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting}
            id="export-attendance-btn"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Report
          </Button>
        </div>

        {/* Loading */}
        {isLoadingData && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && !isLoadingData && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Content */}
        {!isLoadingData && !error && analyticsData && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessions</p>
                      <p className="text-2xl font-bold">{analyticsData.total_sessions}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">My Courses</p>
                      <p className="text-2xl font-bold">{analyticsData.total_courses}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                      <p className="text-2xl font-bold">{analyticsData.avg_attendance}%</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Trend</p>
                      <p className={`text-2xl font-bold ${trendColor}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                      </p>
                    </div>
                    <TrendIcon className={`h-8 w-8 ${trendColor}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Session Attendance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Attendance Trend</CardTitle>
                  <CardDescription>Attendance rate across recent sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    {analyticsData.session_trend?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.session_trend}>
                          <defs>
                            <linearGradient id="colorLecturerAtt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="attendance"
                            stroke="hsl(var(--primary))"
                            fill="url(#colorLecturerAtt)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No closed sessions yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Pattern */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Pattern</CardTitle>
                  <CardDescription>Average attendance rate by day of week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData.weekly_pattern}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
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

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status Distribution</CardTitle>
                  <CardDescription>Overall attendance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.status_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData.status_distribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value}%`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-3 flex-wrap">
                    {analyticsData.status_distribution.map((item: any) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs">{item.name}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* At-Risk Students */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Students Below 75% Attendance</CardTitle>
                  <CardDescription>Students who may need attention</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.at_risk_students?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>No at-risk students. Great attendance!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[240px] overflow-y-auto">
                      {analyticsData.at_risk_students?.map((student: any, index: number) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.matric_no || student.email} · {student.course_code}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-bold text-sm ${student.attendance < 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                              {student.attendance}%
                            </p>
                            <p className="text-xs text-muted-foreground">attendance</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
