'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'lecturer' | 'student' | 'staff')[]
}

const roleRouteMap: Record<string, string> = {
  student: '/student',
  lecturer: '/lecturer',
  admin: '/admin',
  staff: '/admin',
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      // Redirect to login if not authenticated
      router.replace('/login')
      return
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard if role is not allowed
      const correctRoute = roleRouteMap[user.role] || '/login'
      if (!pathname.startsWith(correctRoute)) {
        router.replace(correctRoute)
      }
    }
  }, [user, isLoading, allowedRoles, router, pathname])

  // Show a full-page loading state while verifying auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Do not render children if the user is unauthenticated or has wrong role
  // This prevents flickering of protected content before the redirect happens
  if (!user || (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return null
  }

  return <>{children}</>
}
