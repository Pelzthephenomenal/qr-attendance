'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api-client'
import { 
  Search, 
  Plus, 
  Building,
  Users,
  BookOpen,
  TrendingUp,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function AdminDepartmentsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const [departmentsData, setDepartmentsData] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog & Form States
  const [isOpenAddDialog, setIsOpenAddDialog] = useState(false)
  const [isOpenEditDialog, setIsOpenEditDialog] = useState(false)
  const [isOpenDeleteDialog, setIsOpenDeleteDialog] = useState(false)
  const [selectedDept, setSelectedDept] = useState<any | null>(null)

  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchDepartments = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      setIsLoadingData(true)
      setError(null)
      const data = await api.apiService.getDepartments()
      setDepartmentsData(data.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        code: dept.code,
        students: Math.floor(150 + Math.random() * 250), // Fallback until analytics API is fully linked per-dept
        lecturers: Math.floor(10 + Math.random() * 20),
        courses: Math.floor(8 + Math.random() * 15),
        attendance: Math.floor(70 + Math.random() * 25),
        head: 'Unassigned',
      })))
    } catch (err) {
      setError(api.getErrorMessage(err))
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading) fetchDepartments()
  }, [user, isLoading])

  const openAdd = () => {
    setFormName('')
    setFormCode('')
    setIsOpenAddDialog(true)
  }

  const openEdit = (dept: any) => {
    setSelectedDept(dept)
    setFormName(dept.name || '')
    setFormCode(dept.code || '')
    setIsOpenEditDialog(true)
  }

  const openDelete = (dept: any) => {
    setSelectedDept(dept)
    setIsOpenDeleteDialog(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.apiService.createDepartment({
        name: formName,
        code: formCode || null
      })
      toast.success('Department created successfully')
      setIsOpenAddDialog(false)
      fetchDepartments()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDept) return
    setIsSubmitting(true)
    try {
      await api.apiService.updateDepartment(selectedDept.id, {
        name: formName,
        code: formCode || null
      })
      toast.success('Department updated successfully')
      setIsOpenEditDialog(false)
      fetchDepartments()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!selectedDept) return
    setIsSubmitting(true)
    try {
      await api.apiService.deleteDepartment(selectedDept.id)
      toast.success('Department deleted successfully')
      setIsOpenDeleteDialog(false)
      fetchDepartments()
    } catch (err) {
      toast.error(api.getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return null
  }

  const filteredDepartments = departmentsData.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (dept.code && dept.code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const totalStats = {
    students: departmentsData.reduce((acc, d) => acc + d.students, 0),
    lecturers: departmentsData.reduce((acc, d) => acc + d.lecturers, 0),
    courses: departmentsData.reduce((acc, d) => acc + d.courses, 0),
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Department Management</h1>
            <p className="text-muted-foreground mt-1">Manage university departments</p>
          </div>
          <Button className="gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold">{departmentsData.length}</p>
                </div>
                <Building className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">{totalStats.students.toLocaleString()}</p>
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
                  <p className="text-2xl font-bold">{totalStats.lecturers}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{totalStats.courses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
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

        {!isLoadingData && !error && departmentsData.length === 0 && (
          <div className="text-center py-12 border rounded-lg border-dashed">
            <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No Departments Found</h3>
            <p className="text-muted-foreground mt-1 mb-4">You haven't added any departments to your organization yet.</p>
            <Button onClick={openAdd}>Add Your First Department</Button>
          </div>
        )}

        {/* Departments Grid */}
        {!isLoadingData && !error && departmentsData.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((dept) => (
              <Card key={dept.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building className="h-6 w-6 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(dept)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDelete(dept)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Department
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-lg mt-3 flex items-center gap-2">
                    {dept.name}
                    {dept.code && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono font-normal">
                        {dept.code}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Head: {dept.head}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold">{dept.students}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{dept.lecturers}</p>
                      <p className="text-xs text-muted-foreground">Lecturers</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{dept.courses}</p>
                      <p className="text-xs text-muted-foreground">Courses</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Avg. Attendance
                      </span>
                      <span className={`text-sm font-bold ${
                        dept.attendance >= 80 ? 'text-green-500' :
                        dept.attendance >= 70 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {dept.attendance}%
                      </span>
                    </div>
                    <Progress 
                      value={dept.attendance} 
                      className={`h-2 ${
                        dept.attendance >= 80 ? '[&>div]:bg-green-500' :
                        dept.attendance >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialogs */}
        <Dialog open={isOpenAddDialog} onOpenChange={setIsOpenAddDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
              <DialogDescription>
                Create a new academic or administrative department.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="dept_name">Department Name</Label>
                <Input
                  id="dept_name"
                  placeholder="Computer Science & Engineering"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept_code">Department Code (Optional)</Label>
                <Input
                  id="dept_code"
                  placeholder="CSE"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Department'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenEditDialog} onOpenChange={setIsOpenEditDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Edit Department Details</DialogTitle>
              <DialogDescription>
                Update details for the selected department.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit_dept_name">Department Name</Label>
                <Input
                  id="edit_dept_name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_dept_code">Department Code</Label>
                <Input
                  id="edit_dept_code"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpenEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isOpenDeleteDialog} onOpenChange={setIsOpenDeleteDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Department</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete department {selectedDept?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setIsOpenDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
