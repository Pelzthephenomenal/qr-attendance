'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiService, getErrorMessage, type AttendanceScanResponse } from '@/lib/api-client'
import { BrowserQRCodeReader } from '@zxing/browser'
import fpPromise from '@fingerprintjs/fingerprintjs'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { 
  QrCode, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Loader2,
  Smartphone,
  AlertCircle
} from 'lucide-react'

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

const getResultConfig = (result: string | null, errorMsg: string | null) => {
  if (errorMsg || !result) {
    return {
      bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
      iconBg: 'bg-red-500/10 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      textColor: 'text-red-700 dark:text-red-400',
      title: 'Scan Error',
      message: errorMsg || 'An unexpected error occurred.',
      subText: 'System or Network Error',
      icon: XCircle,
    }
  }

  switch (result) {
    case 'accepted':
      return {
        bg: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        title: 'Attendance Marked!',
        message: 'Your attendance has been successfully marked.',
        subText: 'Status: Present / Late',
        icon: CheckCircle2,
      }
    case 'duplicate':
      return {
        bg: 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10',
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        textColor: 'text-amber-700 dark:text-amber-400',
        title: 'Already Recorded',
        message: 'Your attendance for this session has already been captured.',
        subText: 'Duplicate Scan',
        icon: AlertCircle,
      }
    case 'expired_token':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Expired Token',
        message: 'The QR token has expired. Please try again with the latest code displayed by the lecturer.',
        subText: 'Token Expired',
        icon: XCircle,
      }
    case 'invalid_token':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Invalid QR Code',
        message: 'The QR token format is invalid or could not be parsed.',
        subText: 'Invalid Token',
        icon: XCircle,
      }
    case 'not_enrolled':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Not Enrolled',
        message: 'You are not enrolled in the course associated with this session.',
        subText: 'Enrollment Error',
        icon: XCircle,
      }
    case 'session_inactive':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Session Inactive',
        message: 'The attendance session is either inactive, closed, or cancelled.',
        subText: 'Session Inactive',
        icon: XCircle,
      }
    case 'outside_location':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Outside Geofence',
        message: 'Your current location is outside the allowed radius for this attendance session.',
        subText: 'Location Rejected',
        icon: XCircle,
      }
    case 'device_rejected':
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Device Rejected',
        message: 'You must scan with your registered primary device for this session.',
        subText: 'Device Rejected',
        icon: XCircle,
      }
    default:
      return {
        bg: 'border-red-500/30 bg-red-500/5 dark:bg-red-500/10',
        iconBg: 'bg-red-500/10 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-700 dark:text-red-400',
        title: 'Recording Failed',
        message: 'Failed to record attendance. Please try again.',
        subText: 'Verification Failed',
        icon: XCircle,
      }
  }
}

export default function StudentScanPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scanResult, setScanResult] = useState<AttendanceScanResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [manualPayload, setManualPayload] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'student')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const stopScanningStream = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
      } catch (err) {
        console.warn('Error stopping scanner controls:', err)
      }
      controlsRef.current = null
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.warn('Error stopping stream tracks:', err)
      }
      streamRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopScanningStream()
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'camera' | 'manual')
    setErrorMessage(null)
    if (value === 'manual') {
      stopScanningStream()
      setScanState('idle')
    }
  }

  const startScanning = async () => {
    try {
      setScanState('scanning')
      setErrorMessage(null)
      
      const codeReader = new BrowserQRCodeReader()
      let videoInputDevices: MediaDeviceInfo[] = []
      
      try {
        videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices()
      } catch (err) {
        console.error('Failed to list video input devices:', err)
        setErrorMessage('Camera access was denied. Switching to Manual Entry.')
        setActiveTab('manual')
        setScanState('idle')
        return
      }
      
      if (videoInputDevices.length === 0) {
        setErrorMessage('No camera found on this device. Switching to Manual Entry.')
        setActiveTab('manual')
        setScanState('idle')
        return
      }

      // Try to find the back camera, fallback to the first one
      const backCamera = videoInputDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('environment')
      )
      const deviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId

      if (!videoRef.current) return

      try {
        const controls = await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          async (result, error) => {
            if (result) {
              stopScanningStream()
              const payload = result.getText()
              await handleSubmitScan(payload)
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('Scan error:', error)
            }
          }
        )
        controlsRef.current = controls
      } catch (err: any) {
        console.error('Camera startup error:', err)
        if (
          err.name === 'NotAllowedError' || 
          err.name === 'PermissionDeniedError' ||
          err.message?.toLowerCase().includes('permission') || 
          err.message?.toLowerCase().includes('allowed')
        ) {
          setErrorMessage('Camera access was denied. Switching to Manual Entry.')
          setActiveTab('manual')
        } else {
          setErrorMessage(err.message || 'Failed to initialize camera scanner')
        }
        setScanState('idle')
      }
    } catch (error: any) {
      console.error('Pre-scan initialization error:', error)
      setErrorMessage(error.message || 'Failed to initialize scanner')
      setScanState('idle')
    }
  }

  const handleSubmitScan = async (payload: string) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    stopScanningStream()
    
    try {
      // 1. Get Device Fingerprint (Best-effort)
      let visitorId: string | undefined = undefined
      try {
        const fp = await fpPromise.load()
        const fpResult = await fp.get()
        visitorId = fpResult.visitorId
      } catch (fpErr) {
        console.warn('Could not retrieve device fingerprint:', fpErr)
      }
      
      // 2. Get Geolocation (Best-effort)
      let latitude: number | undefined = undefined
      let longitude: number | undefined = undefined
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            })
          })
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      } catch (geoErr) {
        console.warn('Could not retrieve geolocation:', geoErr)
      }

      // 3. Submit payload to API
      const apiResult = await apiService.submitAttendanceScan({
        payload,
        latitude,
        longitude,
        device_fingerprint: visitorId
      })
      setScanResult(apiResult)
      setScanState('success')
    } catch (err) {
      setErrorMessage(getErrorMessage(err))
      setScanState('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetScan = () => {
    stopScanningStream()
    setScanState('idle')
    setScanResult(null)
    setErrorMessage(null)
    setManualPayload('')
  }

  if (isLoading || !user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Scan QR Code</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">Point your camera at the QR code or enter the payload manually</p>
        </div>

        {activeTab === 'manual' && errorMessage && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm rounded-lg flex items-start gap-3 transition-all">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-xs opacity-90">{errorMessage}</p>
            </div>
          </div>
        )}

        {(scanState === 'success' || scanState === 'error') ? (
          (() => {
            const config = getResultConfig(scanResult?.result || null, errorMessage)
            const Icon = config.icon
            return (
              <Card className={`overflow-hidden border-t-4 shadow-lg transition-all duration-300 ${config.bg}`}>
                <CardContent className="p-8 text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle ${config.iconBg}`}>
                    <Icon className={`h-10 w-10 ${config.iconColor}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${config.textColor}`}>
                    {config.title}
                  </h3>
                  <p className="text-sm text-foreground/80 font-medium mb-3">
                    {scanResult?.message || config.message}
                  </p>
                  {scanResult?.status && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-background/50 border border-border/50 text-muted-foreground mb-6">
                      Status: {scanResult.status.toUpperCase()}
                    </div>
                  )}
                  <div className="pt-2">
                    <Button onClick={resetScan} className="gap-2 w-full sm:w-auto px-6">
                      <RefreshCw className="h-4 w-4" />
                      Scan Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })()
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted rounded-xl">
              <TabsTrigger value="camera" className="gap-2 rounded-lg py-2.5 transition-all">
                <Camera className="h-4 w-4" />
                Camera Scanner
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2 rounded-lg py-2.5 transition-all">
                <QrCode className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-4">
              <Card className="overflow-hidden shadow-md">
                <CardContent className="p-0">
                  <div className="relative aspect-square max-h-[400px] bg-muted flex items-center justify-center">
                    {scanState === 'idle' && (
                      <div className="text-center p-8">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                          <QrCode className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                          Click the button below to start your device camera and scan the attendance QR code.
                        </p>
                        <Button onClick={startScanning} size="lg" className="gap-2 shadow-sm">
                          <Camera className="h-5 w-5" />
                          Start Camera
                        </Button>
                      </div>
                    )}

                    {scanState === 'scanning' && !isSubmitting && (
                      <div className="relative w-full h-full">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative w-64 h-64">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                            <div className="absolute inset-x-4 top-4 h-0.5 bg-primary animate-pulse" 
                                 style={{ 
                                   animation: 'scan 2s ease-in-out infinite',
                                 }} 
                            />
                          </div>
                        </div>
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                          <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">Scanning for QR code...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isSubmitting && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Recording attendance...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  {isSubmitting ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium text-muted-foreground">Recording attendance...</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      if (manualPayload.trim()) {
                        handleSubmitScan(manualPayload.trim())
                      }
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="payload" className="text-sm font-semibold text-foreground/90">
                          QR Payload JSON
                        </label>
                        <Textarea
                          id="payload"
                          placeholder='e.g., {"type": "qr_attendance", "session_id": "...", "token_id": "...", "nonce": "..."}'
                          value={manualPayload}
                          onChange={(e) => setManualPayload(e.target.value)}
                          className="font-mono text-xs h-32 focus-visible:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste the raw token payload string copied from the session or lecturer device screen.
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full gap-2 py-2.5 shadow-sm" 
                        disabled={isSubmitting || !manualPayload.trim()}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Submit Payload
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Instructions */}
        <Card className="shadow-xs border border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold">How to Mark Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary font-mono">1</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Select Mode</p>
                  <p className="text-xs text-muted-foreground">Use the camera scanner or fallback manual entry</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary font-mono">2</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Scan / Submit</p>
                  <p className="text-xs text-muted-foreground">Align the QR inside the frame or paste the payload JSON</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary font-mono">3</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">Marked Present</p>
                  <p className="text-xs text-muted-foreground">Your attendance details are immediately saved</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile tip */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/50 shadow-xs">
          <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            For best results, use a mobile device, enable GPS/location access, and ensure adequate lighting.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(240px); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </DashboardLayout>
  )
}
