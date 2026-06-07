'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/lib/auth-context'
import { apiService, getErrorMessage, type CourseResponse, type QRTokenResponse, type SessionResponse } from '@/lib/api-client'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  QrCode,
  RefreshCw,
  Download,
  Clock,
  Users,
  Copy,
  Check,
  Timer,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export default function LecturerGeneratePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [courses, setCourses] = useState<CourseResponse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [qrToken, setQrToken] = useState<QRTokenResponse | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user || user.role !== 'lecturer') return

    const loadCourses = async () => {
      try {
        setError(null)
        const data = await apiService.getMyCourses()
        setCourses(data)
        if (data.length > 0) {
          setSelectedCourse(data[0].id)
        }
      } catch (err) {
        setError(getErrorMessage(err))
      }
    }

    loadCourses()
  }, [user])

  useEffect(() => {
    if (!qrToken) {
      setTimeRemaining(0)
      return
    }

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((new Date(qrToken.expires_at).getTime() - Date.now()) / 1000))
      setTimeRemaining(seconds)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [qrToken])

  if (isLoading || !user) {
    return null
  }

  const selectedCourseData = courses.find((course) => course.id === selectedCourse)
  const qrGenerated = Boolean(qrToken)

  const generateQR = async () => {
    if (!selectedCourseData) return

    setIsBusy(true)
    setError(null)

    try {
      const startsAt = new Date()
      const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000)
      const createdSession = await apiService.createCourseSession(selectedCourseData.id, {
        title: `${selectedCourseData.code} Attendance`,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        late_after_minutes: 15,
        qr_rotation_seconds: 300,
      })
      const started = await apiService.startSession(createdSession.id)
      setSession(started.session)
      setQrToken(started.qr)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const refreshQR = async () => {
    if (!session) return

    setIsBusy(true)
    setError(null)
    try {
      const nextToken = await apiService.rotateSessionQr(session.id)
      setQrToken(nextToken)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const closeCurrentSession = async () => {
    if (!session) return

    setIsBusy(true)
    setError(null)
    try {
      const closed = await apiService.closeSession(session.id)
      setSession(closed)
      setQrToken(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsBusy(false)
    }
  }

  const copyCode = () => {
    if (!qrToken) return
    navigator.clipboard.writeText(qrToken.payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg || !selectedCourseData) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `attendance-qr-${selectedCourseData.code}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    img.crossOrigin = 'anonymous'
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Generate QR Code</h1>
          <p className="text-muted-foreground mt-1">Create a backend-issued QR code for student attendance</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Course</CardTitle>
            <CardDescription>Choose the course for this attendance session</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCourse} onValueChange={setSelectedCourse} disabled={qrGenerated || isBusy}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{course.code}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{course.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCourseData && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCourseData.student_count} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCourseData.academic_year || 'Current year'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCourseData.term || 'Active term'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8">
            {!qrGenerated ? (
              <div className="text-center">
                <div className="w-64 h-64 mx-auto rounded-2xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">QR code will appear here</p>
                  </div>
                </div>
                <Button
                  onClick={generateQR}
                  disabled={!selectedCourse || isBusy}
                  size="lg"
                  className="mt-6 gap-2"
                >
                  {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
                  Start Session
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                  timeRemaining <= 60 ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                }`}>
                  <Timer className="h-4 w-4" />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                  <span className="text-sm">remaining</span>
                </div>

                <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={qrToken?.payload || ''}
                    size={240}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="mt-6">
                  <p className="text-lg font-semibold">{selectedCourseData?.code}</p>
                  <p className="text-muted-foreground">{selectedCourseData?.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Session status: {session?.status}</p>
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <code className="px-3 py-1.5 rounded bg-muted text-sm font-mono">
                    {qrToken?.payload.slice(0, 24)}...
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyCode}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <Button variant="outline" onClick={refreshQR} disabled={isBusy} className="gap-2">
                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Rotate
                  </Button>
                  <Button variant="outline" onClick={downloadQR} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="destructive" onClick={closeCurrentSession} disabled={isBusy} className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Close Session
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {qrGenerated && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Details</CardTitle>
              <CardDescription>Backend-controlled QR session state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg bg-green-500/10 text-center">
                  <p className="text-2xl font-bold text-green-500">Active</p>
                  <p className="text-sm text-muted-foreground">Session</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 text-center">
                  <p className="text-2xl font-bold text-primary">{formatTime(timeRemaining)}</p>
                  <p className="text-sm text-muted-foreground">QR Lifetime</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedCourseData?.student_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Enrolled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
