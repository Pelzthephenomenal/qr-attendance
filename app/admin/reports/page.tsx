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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/api-client'
import {
  FileDown,
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
} from 'lucide-react'

export default function AdminReportsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [courses, setCourses] = useState<any[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Filter state
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const loadCourses = async () => {
      if (!user || user.role !== 'admin') return
      try {
        const data = await api.apiService.getCourses()
        setCourses(data)
      } catch (err) {
        console.error('Failed to load courses', err)
      } finally {
        setIsLoadingCourses(false)
      }
    }
    if (!isLoading) loadCourses()
  }, [user, isLoading])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setExportError(null)
      setExportSuccess(false)

      await api.apiService.exportAttendanceCSV({
        courseId: selectedCourse !== 'all' ? selectedCourse : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 4000)
    } catch (err) {
      setExportError(api.getErrorMessage(err))
    } finally {
      setIsExporting(false)
    }
  }

  const setPreset = (preset: string) => {
    const now = new Date()
    const toDate = now.toISOString().slice(0, 10)
    setDateTo(toDate)
    const from = new Date(now)

    if (preset === 'week') from.setDate(now.getDate() - 7)
    else if (preset === 'month') from.setMonth(now.getMonth() - 1)
    else if (preset === 'semester') from.setMonth(now.getMonth() - 4)
    else if (preset === 'year') from.setFullYear(now.getFullYear() - 1)
    else { setDateFrom(''); setDateTo(''); return }

    setDateFrom(from.toISOString().slice(0, 10))
  }

  if (isLoading || !user) return null

  const hasFilters = selectedCourse !== 'all' || dateFrom || dateTo

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Export Reports</h1>
          <p className="text-muted-foreground mt-1">Download attendance data as a CSV spreadsheet</p>
        </div>

        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Attendance Export
            </CardTitle>
            <CardDescription>
              Exports a CSV containing student names, matric numbers, session details, attendance status, and timestamps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Presets */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Quick Date Range</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Last 7 days', value: 'week' },
                  { label: 'Last month', value: 'month' },
                  { label: 'Last semester', value: 'semester' },
                  { label: 'Last year', value: 'year' },
                  { label: 'All time', value: 'all' },
                ].map(preset => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setPreset(preset.value)}
                    className="text-xs h-8"
                  >
                    <Calendar className="h-3 w-3 mr-1.5" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Course Filter */}
              <div className="space-y-2">
                <Label htmlFor="course-select">Course (optional)</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger id="course-select">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {isLoadingCourses ? (
                      <SelectItem value="_loading" disabled>Loading…</SelectItem>
                    ) : (
                      courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} — {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Empty spacer */}
              <div />

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <Filter className="h-4 w-4 shrink-0" />
                <span>
                  {selectedCourse !== 'all' && (
                    <>Course: <strong className="text-foreground">{courses.find(c => c.id === selectedCourse)?.code || selectedCourse}</strong></>
                  )}
                  {dateFrom && <>&nbsp;· From: <strong className="text-foreground">{dateFrom}</strong></>}
                  {dateTo && <>&nbsp;· To: <strong className="text-foreground">{dateTo}</strong></>}
                </span>
              </div>
            )}

            {/* Success / Error feedback */}
            {exportSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                CSV downloaded successfully!
              </div>
            )}
            {exportError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {exportError}
              </div>
            )}

            {/* Export Button */}
            <Button
              id="download-csv-btn"
              onClick={handleExport}
              disabled={isExporting}
              size="lg"
              className="w-full gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating CSV…
                </>
              ) : (
                <>
                  <FileDown className="h-5 w-5" />
                  Download Attendance CSV
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border border-border/60 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">What's included in the export?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
              {[
                'Student full name & email',
                'Matric / student number',
                'Course code & title',
                'Session title & date',
                'Attendance status (Present / Late / Absent)',
                'Minutes late (if applicable)',
                'Manual override flag',
                'Exact timestamp of marking',
                'Lecturer notes',
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
