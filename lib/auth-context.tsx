'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiService, tokenStorage } from './api-client'

/**
 * User type matching API response
 */
export interface User {
  id: string
  organization_id: string
  department_id?: string | null
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'lecturer' | 'student' | 'staff'
  matric_no?: string | null
  staff_no?: string | null
  phone?: string | null
  is_active: boolean
  is_verified: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize auth on mount - check for stored tokens and user
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = tokenStorage.getUser()
        const accessToken = tokenStorage.getAccessToken()

        if (storedUser && accessToken) {
          // Check if token is expired
          if (!tokenStorage.isTokenExpired(accessToken)) {
            setUser(storedUser)
          } else {
            // Token expired, try to refresh
            const refreshToken = tokenStorage.getRefreshToken()
            if (refreshToken) {
              try {
                await apiService.refreshTokens(refreshToken)
                // Fetch current user
                const currentUser = await apiService.getCurrentUser()
                setUser(currentUser || storedUser)
              } catch {
                // Refresh failed, clear tokens
                tokenStorage.clearTokens()
              }
            } else {
              tokenStorage.clearTokens()
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        tokenStorage.clearTokens()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  /**
   * Login with email and password
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await apiService.login(email, password)
      setUser(response.user)
      return { success: true, user: response.user }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please try again.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await apiService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setError(null)
      tokenStorage.clearTokens()
    }
  }

  /**
   * Clear error message
   */
  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
