import axios, { AxiosInstance, AxiosError } from 'axios'

/**
 * API Client for QR Attendance System
 * Handles authentication, token management, and HTTP requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

interface ApiResponse<T> {
  data: T
  message?: string
}

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  user: {
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
}

type CurrentUserResponse = LoginResponse['user']

export interface CourseResponse {
  id: string
  organization_id: string
  department_id: string | null
  code: string
  title: string
  description: string | null
  academic_year: string | null
  term: string | null
  level: string | null
  is_active: boolean
  student_count: number
  instructor_ids: string[]
}

export interface SessionResponse {
  id: string
  course_id: string
  created_by: string
  title: string | null
  status: 'draft' | 'scheduled' | 'active' | 'closed' | 'cancelled'
  session_date: string
  starts_at: string
  ends_at: string
  late_after_minutes: number
  qr_rotation_seconds: number
  location_name: string | null
  require_location: boolean
  require_device_check: boolean
  started_at: string | null
  closed_at: string | null
}

export interface QRTokenResponse {
  session_id: string
  token_id: string
  payload: string
  issued_at: string
  expires_at: string
}

export interface SessionStartResponse {
  session: SessionResponse
  qr: QRTokenResponse
}

export interface AttendanceScanRequest {
  payload: string
  latitude?: number
  longitude?: number
  device_fingerprint?: string
}

export interface AttendanceScanResponse {
  result: 'accepted' | 'duplicate' | 'invalid_token' | 'expired_token' | 'not_enrolled' | 'session_inactive'
  status: 'present' | 'late' | 'absent' | 'excused' | null
  message: string
  session_id: string | null
  attendance_record_id: string | null
}

interface TokenPayload {
  access_token: string
  refresh_token: string
  user?: LoginResponse['user']
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'qr_attend_access_token'
const REFRESH_TOKEN_KEY = 'qr_attend_refresh_token'
const USER_KEY = 'qr_attend_user'

/**
 * Storage utilities for JWT tokens
 */
export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setTokens: (tokens: TokenPayload): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  },

  clearTokens: (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getUser: () => {
    if (typeof window === 'undefined') return null
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  },

  setUser: (user: LoginResponse['user']): void => {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  },
}

/**
 * Create API client instance with axios
 */
let apiClient: AxiosInstance | null = null

export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor: Add access token to requests
  client.interceptors.request.use(
    (config) => {
      const token = tokenStorage.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor: Handle token refresh on 401
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          const refreshToken = tokenStorage.getRefreshToken()
          if (!refreshToken) {
            tokenStorage.clearTokens()
            window.location.href = '/login'
            return Promise.reject(error)
          }

          // Attempt to refresh tokens
          const response = await axios.post<TokenPayload>(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          )

          tokenStorage.setTokens(response.data)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`
          return client(originalRequest)
        } catch (refreshError) {
          tokenStorage.clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    apiClient = createApiClient()
  }
  return apiClient
}

/**
 * API Service methods
 */
export const apiService = {
  /**
   * User login
   * @param email User email
   * @param password User password
   * @returns Login response with tokens and user info
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const client = getApiClient()
    const response = await client.post<LoginResponse>('/api/v1/auth/login', {
      email,
      password,
    })
    tokenStorage.setTokens({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    })
    tokenStorage.setUser(response.data.user)
    return response.data
  },

  /**
   * Get current user info
   * @returns Current user object
   */
  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const client = getApiClient()
    const response = await client.get<CurrentUserResponse>('/api/v1/auth/me')
    return response.data
  },

  /**
   * User logout
   */
  logout: async (): Promise<void> => {
    try {
      const client = getApiClient()
      const refreshToken = tokenStorage.getRefreshToken()
      if (refreshToken) {
        await client.post('/api/v1/auth/logout', { refresh_token: refreshToken })
      }
    } catch (error) {
      // Logout anyway even if API fails
      console.error('Logout API error:', error)
    } finally {
      tokenStorage.clearTokens()
    }
  },

  /**
   * Refresh access token
   * @param refreshToken Refresh token
   * @returns New tokens
   */
  refreshTokens: async (refreshToken: string): Promise<TokenPayload> => {
    const client = getApiClient()
    const response = await client.post<TokenPayload>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    })
    tokenStorage.setTokens(response.data)
    if (response.data.user) {
      tokenStorage.setUser(response.data.user)
    }
    return response.data
  },

  getMyCourses: async (): Promise<CourseResponse[]> => {
    const client = getApiClient()
    const response = await client.get<CourseResponse[]>('/api/v1/courses/me/courses')
    return response.data
  },

  createCourseSession: async (
    courseId: string,
    payload: {
      title?: string
      starts_at: string
      ends_at: string
      late_after_minutes?: number
      qr_rotation_seconds?: number
      location_name?: string
    }
  ): Promise<SessionResponse> => {
    const client = getApiClient()
    const response = await client.post<SessionResponse>(`/api/v1/courses/${courseId}/sessions`, payload)
    return response.data
  },

  startSession: async (sessionId: string): Promise<SessionStartResponse> => {
    const client = getApiClient()
    const response = await client.post<SessionStartResponse>(`/api/v1/sessions/${sessionId}/start`)
    return response.data
  },

  closeSession: async (sessionId: string): Promise<SessionResponse> => {
    const client = getApiClient()
    const response = await client.post<SessionResponse>(`/api/v1/sessions/${sessionId}/close`)
    return response.data
  },

  rotateSessionQr: async (sessionId: string): Promise<QRTokenResponse> => {
    const client = getApiClient()
    const response = await client.post<QRTokenResponse>(`/api/v1/sessions/${sessionId}/qr/rotate`)
    return response.data
  },

  submitAttendanceScan: async (payload: AttendanceScanRequest): Promise<AttendanceScanResponse> => {
    const client = getApiClient()
    const response = await client.post<AttendanceScanResponse>('/api/v1/attendance/scan', payload)
    return response.data
  },

  getDepartments: async () => {
    const response = await getApiClient().get('/api/v1/departments')
    return response.data
  },

  createDepartment: async (payload: { name: string; code?: string | null }) => {
    const response = await getApiClient().post('/api/v1/departments', payload)
    return response.data
  },

  updateDepartment: async (id: string, payload: { name?: string | null; code?: string | null }) => {
    const response = await getApiClient().patch(`/api/v1/departments/${id}`, payload)
    return response.data
  },

  deleteDepartment: async (id: string) => {
    const response = await getApiClient().delete(`/api/v1/departments/${id}`)
    return response.data
  },

  getCourses: async () => {
    const response = await getApiClient().get('/api/v1/courses')
    return response.data
  },

  createCourse: async (payload: {
    code: string
    title: string
    description?: string | null
    academic_year?: string | null
    term?: string | null
    level?: string | null
    department_id?: string | null
    is_active?: boolean
    instructor_ids?: string[] | null
  }) => {
    const response = await getApiClient().post('/api/v1/courses', payload)
    return response.data
  },

  updateCourse: async (
    id: string,
    payload: {
      code?: string
      title?: string
      description?: string | null
      academic_year?: string | null
      term?: string | null
      level?: string | null
      department_id?: string | null
      is_active?: boolean | null
      instructor_ids?: string[] | null
    }
  ) => {
    const response = await getApiClient().patch(`/api/v1/courses/${id}`, payload)
    return response.data
  },

  deleteCourse: async (id: string) => {
    const response = await getApiClient().delete(`/api/v1/courses/${id}`)
    return response.data
  },

  getUsers: async () => {
    const response = await getApiClient().get('/api/v1/users')
    return response.data
  },

  createUser: async (payload: {
    email: string
    password?: string
    first_name: string
    last_name: string
    role: string
    department_id?: string | null
    matric_no?: string | null
    staff_no?: string | null
    phone?: string | null
  }) => {
    const response = await getApiClient().post('/api/v1/users', payload)
    return response.data
  },

  updateUser: async (
    id: string,
    payload: {
      email?: string
      first_name?: string
      last_name?: string
      role?: string
      department_id?: string | null
      matric_no?: string | null
      staff_no?: string | null
      phone?: string | null
      is_active?: boolean | null
    }
  ) => {
    const response = await getApiClient().patch(`/api/v1/users/${id}`, payload)
    return response.data
  },

  getLecturerCourseStats: async () => {
    const response = await getApiClient().get('/api/v1/courses/me/stats')
    return response.data
  },


  deleteUser: async (id: string) => {
    const response = await getApiClient().delete(`/api/v1/users/${id}`)
    return response.data
  },

  bulkImportUsers: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await getApiClient().post('/api/v1/users/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  getAdminAnalytics: async () => {
    const response = await getApiClient().get('/api/v1/analytics/admin')
    return response.data
  },

  getLecturerAnalytics: async () => {
    const response = await getApiClient().get('/api/v1/analytics/lecturer')
    return response.data
  },

  getLecturerAnalyticsCourses: async () => {
    const response = await getApiClient().get('/api/v1/analytics/lecturer/courses')
    return response.data
  },

  getStudentCourseAttendance: async () => {
    const response = await getApiClient().get('/api/v1/analytics/student/courses')
    return response.data
  },

  getAdminRecentActivity: async () => {
    const response = await getApiClient().get('/api/v1/analytics/admin/activity')
    return response.data
  },

  getCourseEnrollments: async (courseId: string) => {
    const response = await getApiClient().get(`/api/v1/courses/${courseId}/enrollments`)
    return response.data
  },

  bulkImportEnrollments: async (courseId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await getApiClient().post(`/api/v1/courses/${courseId}/enrollments/bulk-import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  getStudentHistory: async () => {
    const response = await getApiClient().get('/api/v1/me/attendance')
    return response.data
  },

  getTodaySchedule: async () => {
    const response = await getApiClient().get('/api/v1/me/schedule/today')
    return response.data
  },

  getWeeklySchedule: async () => {
    const response = await getApiClient().get('/api/v1/me/schedule/weekly')
    return response.data
  },

  getNotifications: async () => {
    const response = await getApiClient().get('/api/v1/notifications')
    return response.data
  },

  markNotificationRead: async (id: string) => {
    const response = await getApiClient().patch(`/api/v1/notifications/${id}/read`)
    return response.data
  },

  markAllNotificationsRead: async () => {
    await getApiClient().post('/api/v1/notifications/read-all')
  },

  exportAttendanceCSV: async (filters: {
    courseId?: string
    sessionId?: string
    dateFrom?: string
    dateTo?: string
  } = {}) => {
    const params = new URLSearchParams()
    if (filters.courseId) params.append('course_id', filters.courseId)
    if (filters.sessionId) params.append('session_id', filters.sessionId)
    if (filters.dateFrom) params.append('date_from', filters.dateFrom)
    if (filters.dateTo) params.append('date_to', filters.dateTo)

    const response = await getApiClient().get(
      `/api/v1/reports/export/attendance?${params.toString()}`,
      { responseType: 'blob' }
    )

    // Derive filename from Content-Disposition header or fall back
    const disposition: string = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : 'attendance.csv'

    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}

/**
 * Error handling utility
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any
      return data.detail || data.message || error.message
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

const api = {
  apiService,
  tokenStorage,
  getApiClient,
  createApiClient,
  getErrorMessage,
}

export default api
