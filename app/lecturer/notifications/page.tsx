'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api-client'
import { Bell, Info, AlertTriangle, CheckCircle, Clock, Check, Trash2 } from 'lucide-react'

export default function LecturerNotificationsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [notificationsData, setNotificationsData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'lecturer')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setIsLoadingData(true)
      const data = await api.apiService.getNotifications()
      setNotificationsData(data)
    } catch (err) {
      console.error('Error fetching notifications', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (!isLoading) fetchNotifications()
  }, [user, isLoading])

  if (isLoading || !user) {
    return null
  }

  const markAsRead = async (id: string) => {
    try {
      await api.apiService.markNotificationRead(id)
      setNotificationsData(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.apiService.markAllNotificationsRead()
      setNotificationsData(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const deleteNotification = (id: string) => {
    // Implement delete logic if endpoint exists, otherwise just hide in UI
    setNotificationsData(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'reminder':
        return <Clock className="h-5 w-5 text-primary" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const unreadCount = notificationsData.filter(n => !n.is_read).length

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} className="gap-2">
              <Check className="h-4 w-4" />
              Mark All as Read
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Notifications</CardTitle>
            <CardDescription>{notificationsData.length} total notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : notificationsData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notificationsData.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                      notification.is_read ? 'bg-muted/30' : 'bg-muted/50 border border-primary/20'
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${notification.is_read ? 'text-muted-foreground' : ''}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(notification.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {!notification.is_read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => markAsRead(notification.id)}
                            className="h-7 text-xs"
                          >
                            Mark as read
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteNotification(notification.id)}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
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
