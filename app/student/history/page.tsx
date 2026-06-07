'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, XCircle, AlertCircle, Search, Filter, Download, Loader2 } from 'lucide-react'
import api from '@/lib/api-client'

export default function StudentHistoryPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [records, setRecords] = useState<any[]>([])
  const [coursesData, setCoursesData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

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
        const [historyRes, coursesRes] = await Promise.all([
          api.apiService.getStudentHistory(),
          api.apiService.getMyCourses()
        ])
        setRecords(historyRes)
        setCoursesData(coursesRes)
      } catch (err) {
        console.error('Error fetching student history:', err)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    if (!isLoading) fetchData()
  }, [user, isLoading])

  if (isLoading || !user || isLoadingData) {
    return null
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await api.apiService.exportAttendanceCSV({
        ...(courseFilter !== 'all' ? { courseId: courseFilter } : {}),
      })
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  const filteredRecords = records.filter(record => {
    const courseTitle = record.session?.course?.title || 'Unknown Course'
    const courseCode = record.session?.course?.code || ''
    const matchesSearch = courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          courseCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCourse = courseFilter === 'all' || record.session?.course?.id === courseFilter
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter
    return matchesSearch && matchesCourse && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'late':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Attendance History</h1>
            <p className="text-muted-foreground mt-1">View your complete attendance records</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={isExporting} id="student-history-export-btn">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Classes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{stats.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-500">{stats.late}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {coursesData.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records</CardTitle>
            <CardDescription>
              Showing {filteredRecords.length} of {records.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No records match your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                  >
                    {getStatusIcon(record.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {record.session?.course?.code || 'Unknown'}
                        </span>
                      </div>
                      <p className="font-medium truncate">{record.session?.course?.title || 'Unknown Course'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.marked_at || record.created_at || new Date()).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                        {` at ${new Date(record.marked_at || record.created_at || new Date()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        record.status === 'present' ? 'bg-green-500/10 text-green-500' :
                        record.status === 'late' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {record.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        via {record.markedBy === 'qr' ? 'QR Scan' : 'Manual'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
